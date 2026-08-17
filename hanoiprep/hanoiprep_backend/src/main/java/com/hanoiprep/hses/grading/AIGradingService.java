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
        List<Rubric> rubrics = rubricRepository.findByLessonIdOrderByQuestionNoAscStepOrderAsc(submission.getLesson().getId());

        // 2. Nếu bài học chưa có rubric hoặc chỉ có 1 rubric tạm tổng quát, tự động trích xuất chi tiết từ file đáp án
        boolean isPlaceholderOnly = rubrics != null && rubrics.size() == 1
                && (rubrics.get(0).getStepDescription() == null
                || rubrics.get(0).getStepDescription().contains("Đánh giá tổng thể"));

        if (rubrics == null || rubrics.isEmpty() || isPlaceholderOnly) {
            log.info("Rubrics not found or only placeholder exists for lesson {}. Extracting detailed rubrics from solution...", submission.getLesson().getId());
            List<Rubric> extracted = rubricExtractionService.extractAndSaveRubricsFromLessonEntity(submission.getLesson());
            if (extracted != null && !extracted.isEmpty()) {
                rubrics = extracted;
            }
        }

        log.info("Grading submission {} with {} rubric steps", submissionId, rubrics.size());

        // 3. Chấm điểm chi tiết theo các tiêu chí rubric
        gradeWithRubrics(submission, rubrics);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Chấm theo barem Rubric (đã được trích xuất từ file đáp án)
    // Mục tiêu: với mỗi tiêu chí rubric, AI đánh giá bài làm học sinh có
    // đáp ứng ĐÚNG yêu cầu của bước đó không, cho điểm tương ứng.
    // ─────────────────────────────────────────────────────────────────────────
    private void gradeWithRubrics(Submission submission, List<Rubric> rubrics) throws Exception {
        double totalMaxScore = rubrics.stream().mapToDouble(Rubric::getMaxScore).sum();
        String studentAnswer = submission.getAnswerText() != null && !submission.getAnswerText().isBlank()
                ? submission.getAnswerText()
                : "Học sinh không nhập câu trả lời hoặc bài nộp trống.";

        // ── Kỹ thuật "Per-criterion forced evaluation" ──
        // Thay vì liệt kê barem rồi nhờ AI tự suy, ta mô tả TỪNG tiêu chí như
        // một câu hỏi độc lập: "Tìm bằng chứng trong bài → kết luận → cho điểm"
        // Cách này buộc AI đọc bài làm nhiều lần (1 lần / tiêu chí), không tổng hợp chung.
        StringBuilder criteriaBlock = new StringBuilder();
        for (int idx = 0; idx < rubrics.size(); idx++) {
            Rubric r = rubrics.get(idx);
            String kw = (r.getExpectedLogicKeyword() != null && !r.getExpectedLogicKeyword().isBlank())
                    ? r.getExpectedLogicKeyword() : "(không yêu cầu từ khóa cụ thể)";
            criteriaBlock.append(String.format(
                    "TIÊU CHÍ %d — rubricId=%d (%s, Bước %d)\n"
                    + "  Yêu cầu: %s\n"
                    + "  Điểm tối đa: %.2f\n"
                    + "  Từ/cụm từ kỹ thuật cần tìm: %s\n"
                    + "  → Hãy trích dẫn NGUYÊN VĂN đoạn trong bài làm liên quan đến tiêu chí này (nếu không tìm thấy ghi \"Không tìm thấy\").\n"
                    + "  → Đánh giá: đúng / sai / đúng một phần → cho điểm từ 0 đến %.2f.\n\n",
                    idx + 1, r.getId(),
                    r.getQuestionNo() != null ? r.getQuestionNo() : "Câu 1",
                    r.getStepOrder(),
                    r.getStepDescription(),
                    r.getMaxScore(),
                    kw,
                    r.getMaxScore()
            ));
        }

        String prompt = "Bạn là giáo viên chấm thi chuyên nghiệp. Hãy chấm điểm BÀI LÀM sau theo từng tiêu chí độc lập.\n\n"
                + "══════════════════════════════════════\n"
                + "BÀI LÀM CỦA HỌC SINH\n"
                + "══════════════════════════════════════\n"
                + studentAnswer
                + "\n\n══════════════════════════════════════\n"
                + "CÁC TIÊU CHÍ CẦN CHẤM (" + rubrics.size() + " tiêu chí, tổng = "
                + String.format("%.2f", totalMaxScore) + " điểm)\n"
                + "══════════════════════════════════════\n"
                + criteriaBlock
                + "══════════════════════════════════════\n"
                + "QUAN TRỌNG: Chấm MỖI TIÊU CHÍ HOÀN TOÀN ĐỘC LẬP.\n"
                + "- KHÔNG chấm theo cảm nhận tổng thể bài làm.\n"
                + "- KHÔNG cho điểm cao vì bài làm nhìn chung tốt hay điểm thấp vì bài nhìn chung yếu.\n"
                + "- CHỈ căn cứ vào: tiêu chí đó yêu cầu gì + bài làm có làm đúng yêu cầu đó không.\n"
                + "- Nếu học sinh làm đúng yêu cầu của tiêu chí → cho điểm tối đa của tiêu chí đó.\n"
                + "- Nếu không tìm thấy bằng chứng → awardedScore = 0.0.\n\n"
                + "Trả về ĐÚNG " + rubrics.size() + " phần tử JSON, KHÔNG có markdown:\n"
                + "[{\"rubricId\": <số_nguyên_từ_rubricId=>, \"awardedScore\": <số_thực_0_đến_maxScore>, \"aiFeedback\": \"<trích_dẫn_và_nhận_xét_ngắn>\"}]";

        String rawAiResponse = geminiService.callGemini(prompt);

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

        List<AIGradingResultDto> results = objectMapper.readValue(coreJson, new TypeReference<>() {});

        if (results.size() != rubrics.size()) {
            log.warn("AI returned {} results but expected {} rubric steps for submission {}. Proceeding with best-effort matching.",
                    results.size(), rubrics.size(), submission.getId());
        }

        double totalScore = 0.0;
        java.util.Set<String> failedQuestionsSet = new java.util.HashSet<>();
        List<SubmissionDetail> detailsToSave = new ArrayList<>();

        for (int i = 0; i < results.size(); i++) {
            AIGradingResultDto result = results.get(i);
            final int index = i;

            // Matching rubricId: 1. By ID (chính xác), 2. By stepOrder, 3. By list index (fallback)
            Rubric matchedRubric = rubrics.stream()
                    .filter(r -> result.getRubricId() != null && r.getId().equals(result.getRubricId()))
                    .findFirst()
                    .orElseGet(() -> rubrics.stream()
                            .filter(r -> result.getRubricId() != null
                                    && Long.valueOf(r.getStepOrder()).equals(result.getRubricId()))
                            .findFirst()
                            .orElseGet(() -> index < rubrics.size() ? rubrics.get(index) : rubrics.get(0)));

            String qNo = matchedRubric.getQuestionNo() != null ? matchedRubric.getQuestionNo() : "Câu 1";
            double rawScore = result.getAwardedScore() != null ? result.getAwardedScore() : 0.0;
            String feedback = result.getAiFeedback() != null ? result.getAiFeedback() : "Đã hoàn thành tiêu chí.";

            double finalScore;

            if (failedQuestionsSet.contains(qNo)) {
                // Bước trước trong cùng câu đã sai → bước này = 0 điểm
                finalScore = 0.0;
                feedback = "Không được tính điểm do bước trước đó trong " + qNo + " đã bị làm sai hoặc thiếu.";
            } else {
                // Đảm bảo điểm không vượt quá trần và làm tròn 2 chữ số
                finalScore = Math.round(Math.min(rawScore, matchedRubric.getMaxScore()) * 100.0) / 100.0;
                // Nếu bước này không đạt điểm tối đa → đánh dấu câu này bị hỏng các bước sau
                if (finalScore < matchedRubric.getMaxScore()) {
                    failedQuestionsSet.add(qNo);
                }
            }

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

        log.info("Submission {} graded successfully. Total score: {}/{}", submission.getId(), submission.getTotalScore(), totalMaxScore);
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
