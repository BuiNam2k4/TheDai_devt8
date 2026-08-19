package com.hanoiprep.hses.grading;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanoiprep.hses.chatbot.GeminiService;
import com.hanoiprep.hses.rubric.Rubric;
import com.hanoiprep.hses.rubric.RubricExtractionService;
import com.hanoiprep.hses.rubric.RubricRepository;
import com.hanoiprep.hses.submission.Submission;
import com.hanoiprep.hses.submission.SubmissionDetail;
import com.hanoiprep.hses.submission.SubmissionDetailRepository;
import com.hanoiprep.hses.submission.SubmissionRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AIGradingService {

    private static final Logger log = LoggerFactory.getLogger(AIGradingService.class);

    private final SubmissionRepository submissionRepository;
    private final SubmissionDetailRepository submissionDetailRepository;
    private final RubricExtractionService rubricExtractionService;
    private final RubricRepository rubricRepository;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private final GeminiService geminiService;

    @Data
    public static class AIGradingResultDto {
        private Long rubricId;
        private Double awardedScore;
        private String aiFeedback;
    }

    @Transactional
    public void gradeSubmission(Long submissionId) throws Exception {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found: " + submissionId));

        // 1. Lấy rubrics theo đúng thứ tự: questionNo ASC, stepOrder ASC
        List<Rubric> rubrics = rubricRepository
                .findByLessonIdOrderByQuestionNoAscStepOrderAsc(submission.getLesson().getId());

        // 2. Nếu bài học chưa có rubric hoặc chỉ có 1 rubric tạm tổng quát, tự động
        // trích xuất chi tiết từ file đáp án
        boolean isPlaceholderOnly = rubrics != null && rubrics.size() == 1
                && (rubrics.get(0).getStepDescription() == null
                        || rubrics.get(0).getStepDescription().contains("Đánh giá tổng thể"));

        if (rubrics == null || rubrics.isEmpty() || isPlaceholderOnly) {
            log.info(
                    "Rubrics not found or only placeholder exists for lesson {}. Extracting detailed rubrics from solution...",
                    submission.getLesson().getId());
            List<Rubric> extracted = rubricExtractionService
                    .extractAndSaveRubricsFromLessonEntity(submission.getLesson());
            if (extracted != null && !extracted.isEmpty()) {
                rubrics = extracted;
            }
        }

        log.info("Grading submission {} with {} rubric steps", submissionId, rubrics.size());

        // 3. Chấm điểm chi tiết theo các tiêu chí rubric
        gradeWithRubrics(submission, rubrics);
    }

    private final RestTemplate restTemplate = new RestTemplate();

    // ─────────────────────────────────────────────────────────────────────────
    // Chấm theo barem Rubric (đã được trích xuất từ file đáp án)
    // Mục tiêu: với mỗi tiêu chí rubric, AI đánh giá bài làm học sinh có
    // đáp ứng ĐÚNG yêu cầu của bước đó không, cho điểm tương ứng.
    // ─────────────────────────────────────────────────────────────────────────
    private void gradeWithRubrics(Submission submission, List<Rubric> rubrics) throws Exception {
        double totalMaxScore = rubrics.stream().mapToDouble(Rubric::getMaxScore).sum();
        String studentAnswer = submission.getAnswerText() != null && !submission.getAnswerText().isBlank()
                ? submission.getAnswerText()
                : "";

        // 1. Tải file bài làm của học sinh nếu có (PDF hoặc Ảnh scan)
        byte[] studentFileBytes = null;
        String mimeType = "application/pdf";
        if (submission.getAnswerFileUrl() != null && !submission.getAnswerFileUrl().isBlank()) {
            try {
                studentFileBytes = restTemplate.getForObject(submission.getAnswerFileUrl(), byte[].class);
                String lowerUrl = submission.getAnswerFileUrl().toLowerCase();
                if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) {
                    mimeType = "image/jpeg";
                } else if (lowerUrl.endsWith(".png")) {
                    mimeType = "image/png";
                } else {
                    mimeType = "application/pdf";
                }
                log.info("Downloaded student answer file ({} bytes, mime: {}) for submission {}",
                        studentFileBytes != null ? studentFileBytes.length : 0, mimeType, submission.getId());
            } catch (Exception e) {
                log.warn("Could not download student answer file from URL [{}]: {}", submission.getAnswerFileUrl(),
                        e.getMessage());
            }
        }

        // 2. Chuẩn bị khối tiêu chí barem
        StringBuilder criteriaBlock = new StringBuilder();
        for (int idx = 0; idx < rubrics.size(); idx++) {
            Rubric r = rubrics.get(idx);
            String kw = (r.getExpectedLogicKeyword() != null && !r.getExpectedLogicKeyword().isBlank())
                    ? r.getExpectedLogicKeyword()
                    : "(không yêu cầu từ khóa cụ thể)";
            criteriaBlock.append(String.format(
                    "TIÊU CHÍ %d — rubricId=%d (%s, Bước %d)\n"
                            + "  Yêu cầu: %s\n"
                            + "  Điểm tối đa: %.2f\n"
                            + "  Từ/cụm từ kỹ thuật cần tìm: %s\n"
                            + "  → Đánh giá: đúng / sai / đúng một phần → cho điểm từ 0.0 đến %.2f.\n\n",
                    idx + 1, r.getId(),
                    r.getQuestionNo() != null ? r.getQuestionNo() : "Câu 1",
                    r.getStepOrder(),
                    r.getStepDescription(),
                    r.getMaxScore(),
                    kw,
                    r.getMaxScore()));
        }

        // 3. Thông tin đề bài gốc
        String lessonTitle = submission.getLesson() != null && submission.getLesson().getTitle() != null
                ? submission.getLesson().getTitle()
                : "Bài tập";
        String lessonContent = submission.getLesson() != null && submission.getLesson().getContentText() != null
                ? submission.getLesson().getContentText()
                : "";

        // 4. Tạo Prompt chuyên sâu có cấu trúc 3 khối rõ ràng
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append(
                "Bạn là giáo viên chấm thi giàu kinh nghiệm và công tâm. Hãy chấm điểm bài làm của học sinh theo thang điểm chi tiết (Rubrics) dưới đây.\n\n");

        promptBuilder.append("═══════════════════════════════════════════\n");
        promptBuilder.append("## KHỐI 1: THÔNG TIN BÀI HỌC & ĐỀ BÀI GỐC\n");
        promptBuilder.append("═══════════════════════════════════════════\n");
        promptBuilder.append("Tên bài: ").append(lessonTitle).append("\n");
        if (!lessonContent.isBlank()) {
            promptBuilder.append("Nội dung đề bài:\n").append(lessonContent).append("\n");
        }
        promptBuilder.append("\n");

        promptBuilder.append("═══════════════════════════════════════════\n");
        promptBuilder.append("## KHỐI 2: BAREM TIÊU CHÍ CHẤM ĐIỂM (").append(rubrics.size())
                .append(" tiêu chí, Tổng = ")
                .append(String.format("%.2f", totalMaxScore)).append(" điểm)\n");
        promptBuilder.append("═══════════════════════════════════════════\n");
        promptBuilder.append(criteriaBlock).append("\n");

        promptBuilder.append("═══════════════════════════════════════════\n");
        promptBuilder.append("## KHỐI 3: BÀI LÀM CỦA HỌC SINH\n");
        promptBuilder.append("═══════════════════════════════════════════\n");
        if (!studentAnswer.isBlank()) {
            promptBuilder.append("Nội dung văn bản học sinh nhập:\n").append(studentAnswer).append("\n\n");
        }
        if (studentFileBytes != null && studentFileBytes.length > 0) {
            promptBuilder.append(
                    "Học sinh có nộp file bài làm đính kèm (ảnh chụp / PDF bài viết tay). Vui lòng đọc kỹ hình ảnh/PDF đính kèm để chấm.\n\n");
        }
        if (studentAnswer.isBlank() && (studentFileBytes == null || studentFileBytes.length == 0)) {
            promptBuilder.append("Học sinh không nhập câu trả lời và không đính kèm file bài làm.\n\n");
        }

        promptBuilder.append("═══════════════════════════════════════════\n");
        promptBuilder.append("## NGUYÊN TẮC CHẤM ĐIỂM SƯ PHẠM (QUAN TRỌNG):\n");
        promptBuilder.append("═══════════════════════════════════════════\n");
        promptBuilder.append(
                "1. **Độc lập và Khách quan:** Chấm từng tiêu chí căn cứ theo mức độ hoàn thành trong bài làm.\n");
        promptBuilder.append(
                "2. **Chấm điểm theo phương pháp (Method Marks):** Nếu học sinh tính toán nhầm số liệu ở bước trên nhưng phương pháp lập luận ở bước dưới vẫn đúng logic $\\to$ Vẫn cho điểm phương pháp của bước dưới, không được cho 0 toàn bộ bài.\n");
        promptBuilder.append(
                "3. **Chỉ cho 0 điểm:** Khi học sinh hoàn toàn không làm tiêu chí đó hoặc sai bản chất lý thuyết nghiêm trọng.\n");
        promptBuilder.append(
                "4. **Nhận xét súc tích:** Trong `aiFeedback`, trích dẫn ngắn gọn phần học sinh làm được/chưa được và lý do trừ điểm (nếu có).\n\n");

        promptBuilder.append("Trả về ĐÚNG ").append(rubrics.size())
                .append(" phần tử JSON, KHÔNG bọc markdown ```json:\n");
        promptBuilder.append(
                "[{\"rubricId\": <số_nguyên_từ_rubricId=>, \"awardedScore\": <số_thực_0_đến_maxScore>, \"aiFeedback\": \"<nhận_xét_ngắn_gọn>\"}]");

        String rawAiResponse;
        if (studentFileBytes != null && studentFileBytes.length > 0) {
            rawAiResponse = geminiService.callGeminiWithMedia(promptBuilder.toString(), studentFileBytes, mimeType);
        } else {
            rawAiResponse = geminiService.callGemini(promptBuilder.toString());
        }

        JsonNode rootNode = objectMapper.readTree(rawAiResponse);
        String coreJson = rootNode.path("candidates").get(0)
                .path("content")
                .path("parts").get(0)
                .path("text").asText();

        coreJson = extractJsonArray(coreJson);

        // Xóa toàn bộ chi tiết điểm cũ của bài nộp này trước khi lưu kết quả mới
        try {
            submissionDetailRepository.deleteBySubmissionId(submission.getId());
        } catch (Exception ignored) {
        }

        List<AIGradingResultDto> results = objectMapper.readValue(coreJson, new TypeReference<>() {
        });

        if (results.size() != rubrics.size()) {
            log.warn(
                    "AI returned {} results but expected {} rubric steps for submission {}. Proceeding with best-effort matching.",
                    results.size(), rubrics.size(), submission.getId());
        }

        double totalScore = 0.0;
        List<SubmissionDetail> detailsToSave = new ArrayList<>();

        for (int i = 0; i < results.size(); i++) {
            AIGradingResultDto result = results.get(i);
            final int index = i;

            // Matching rubricId: 1. By ID (chính xác), 2. By stepOrder, 3. By list index
            // (fallback)
            Rubric matchedRubric = rubrics.stream()
                    .filter(r -> result.getRubricId() != null && r.getId().equals(result.getRubricId()))
                    .findFirst()
                    .orElseGet(() -> rubrics.stream()
                            .filter(r -> result.getRubricId() != null
                                    && Long.valueOf(r.getStepOrder()).equals(result.getRubricId()))
                            .findFirst()
                            .orElseGet(() -> index < rubrics.size() ? rubrics.get(index) : rubrics.get(0)));

            double rawScore = result.getAwardedScore() != null ? result.getAwardedScore() : 0.0;
            String feedback = result.getAiFeedback() != null ? result.getAiFeedback() : "Đã hoàn thành tiêu chí.";

            // Đảm bảo điểm nằm trong khoảng 0 đến maxScore và làm tròn 2 chữ số thập phân
            double finalScore = Math.round(Math.min(Math.max(0.0, rawScore), matchedRubric.getMaxScore()) * 100.0)
                    / 100.0;

            detailsToSave.add(SubmissionDetail.builder()
                    .submission(submission)
                    .rubric(matchedRubric)
                    .awardedScore(finalScore)
                    .aiFeedback(feedback)
                    .build());

            totalScore += finalScore;
        }

        // Lưu toàn bộ details bằng saveAll() — 1 batch thay vì N roundtrips
        submissionDetailRepository.saveAll(detailsToSave);

        // Làm tròn tổng điểm 2 chữ số thập phân
        submission.setTotalScore(Math.round(totalScore * 100.0) / 100.0);
        submission.setStatus("GRADED");
        submission.setGradedAt(LocalDateTime.now());
        submissionRepository.save(submission);

        log.info("Submission {} graded successfully. Total score: {}/{}", submission.getId(),
                submission.getTotalScore(), totalMaxScore);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: trích xuất & tự động sửa lỗi JSON Array từ response AI
    // ─────────────────────────────────────────────────────────────────────────
    private String extractJsonArray(String text) {
        if (text == null)
            return "[]";
        text = text.trim();

        if (text.startsWith("```json"))
            text = text.substring(7);
        else if (text.startsWith("```"))
            text = text.substring(3);
        if (text.endsWith("```"))
            text = text.substring(0, text.length() - 3);
        text = text.trim();

        int start = text.indexOf('[');
        int end = text.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            String candidate = text.substring(start, end + 1);
            try {
                objectMapper.readTree(candidate);
                return candidate;
            } catch (Exception ignored) {
            }
        }

        // Fallback: Regex trích xuất tất cả các đối tượng JSON {...} hoàn chỉnh hợp lệ
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\{[^{}]*\\}");
        java.util.regex.Matcher matcher = pattern.matcher(text);
        List<String> validObjects = new ArrayList<>();
        while (matcher.find()) {
            String objStr = matcher.group();
            try {
                objectMapper.readTree(objStr);
                validObjects.add(objStr);
            } catch (Exception ignored) {
            }
        }

        if (!validObjects.isEmpty()) {
            return "[" + String.join(",", validObjects) + "]";
        }

        return "[]";
    }
}