package com.hanoiprep.hses.grading;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanoiprep.hses.chatbot.GeminiService;
import com.hanoiprep.hses.rubric.Rubric;
import com.hanoiprep.hses.rubric.RubricExtractionService;
import com.hanoiprep.hses.submission.Submission;
import com.hanoiprep.hses.submission.SubmissionDetail;
import com.hanoiprep.hses.submission.SubmissionDetailRepository;
import com.hanoiprep.hses.submission.SubmissionRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AIGradingService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionDetailRepository submissionDetailRepository;
    private final RubricExtractionService rubricExtractionService;
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
                .orElseThrow(() -> new RuntimeException("Submission not found"));

        // Tự động xóa toàn bộ tiêu chí mẫu cũ trong DB và sinh tiêu chí mới 100% từ
        // file đáp án (solution) bằng AI
        List<Rubric> rubrics = rubricExtractionService.extractAndSaveRubricsFromLessonEntity(submission.getLesson());

        // Chấm điểm chi tiết theo các tiêu chí đã sinh từ file đáp án
        gradeWithRubrics(submission, rubrics);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Chấm theo barem Rubric (đã được trích xuất từ file đáp án)
    // ─────────────────────────────────────────────────────────────────────────
    private void gradeWithRubrics(Submission submission, List<Rubric> rubrics) throws Exception {
        String rubricContext = rubrics.stream()
                .map(r -> String.format("ID: %d | Bước: %d | Yêu cầu: %s | Điểm tối đa: %.2f",
                        r.getId(), r.getStepOrder(), r.getStepDescription(), r.getMaxScore()))
                .collect(Collectors.joining("\n"));

        double totalMaxScore = rubrics.stream().mapToDouble(Rubric::getMaxScore).sum();

        String prompt = "Bạn là giáo viên chấm thi chuyên nghiệp.\n" +
                "Dưới đây là barem chi tiết (phân theo từng Bài/Câu) và bài làm của học sinh.\n\n" +
                "BAREM CHẤM ĐIỂM:\n" + rubricContext + "\n\n" +
                "BÀI LÀM CỦA HỌC SINH:\n"
                + (submission.getAnswerText() != null ? submission.getAnswerText() : "Học sinh không nhập câu trả lời.")
                + "\n\n" +
                "QUY TẮC CHẤM THI NGHIÊM NGẶT:\n" +
                "1. Chấm điểm lần lượt từng bước trong từng Bài/Câu.\n" +
                "2. NẾU HỌC SINH LÀM SAI HOẶC THIẾU Ở BẤT KỲ BƯỚC NÀO TRONG MỘT CÂU, THÌ TẤT CẢ CÁC BƯỚC ĐẰNG SAU CỦA CÂU ĐÓ PHẢI CHO 0 ĐIỂM (awardedScore = 0.0) vì kết quả các bước sau của câu đó đã bị sai theo.\n"
                +
                "3. MỖI BÀI/CÂU ĐƯỢC CHẤM ĐỘC LẬP: Lỗi sai ở Câu a KHÔNG làm ảnh hưởng đến điểm của Câu b hay các câu khác.\n"
                +
                "4. Đối với các bước đằng sau bị 0 điểm do bước trước sai, phần aiFeedback ghi rõ: 'Không được tính điểm do bước trước đó trong câu này đã bị làm sai hoặc thiếu.'\n\n"
                +
                "Chỉ trả về một mảng JSON nguyên chất, KHÔNG có markdown:\n" +
                "[{\"rubricId\": <ID_số_nguyên>, \"awardedScore\": <điểm_số_thực>, \"aiFeedback\": \"<nhận xét chi tiết>\"}]\n"
                +
                "Điểm tối đa của mỗi tiêu chí không được vượt quá barem. Tổng điểm tối đa là " + totalMaxScore + ".";

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

        List<AIGradingResultDto> results = objectMapper.readValue(coreJson, new TypeReference<>() {
        });

        double totalScore = 0.0;
        java.util.Set<String> failedQuestionsSet = new java.util.HashSet<>();

        for (int i = 0; i < results.size(); i++) {
            AIGradingResultDto result = results.get(i);
            final int index = i;

            // Robust matching: 1. By ID, 2. By stepOrder, 3. By list index
            Rubric matchedRubric = rubrics.stream()
                    .filter(r -> result.getRubricId() != null && r.getId().equals(result.getRubricId()))
                    .findFirst()
                    .orElseGet(() -> rubrics.stream()
                            .filter(r -> result.getRubricId() != null
                                    && Long.valueOf(r.getStepOrder()).equals(result.getRubricId()))
                            .findFirst()
                            .orElseGet(() -> index < rubrics.size() ? rubrics.get(index) : rubrics.get(0)));

            String qNo = matchedRubric.getQuestionNo() != null ? matchedRubric.getQuestionNo() : "Bài 1";
            double rawScore = result.getAwardedScore() != null ? result.getAwardedScore() : 0.0;
            String feedback = result.getAiFeedback() != null ? result.getAiFeedback() : "Đã hoàn thành tiêu chí.";

            double finalScore = 0.0;

            if (failedQuestionsSet.contains(qNo)) {
                finalScore = 0.0;
                feedback = "Không được tính điểm do bước trước đó trong " + qNo + " đã bị làm sai hoặc thiếu.";
            } else {
                finalScore = Math.min(rawScore, matchedRubric.getMaxScore());
                // Nếu bước này trong câu này không đạt điểm tối đa -> đánh dấu câu qNo này bị
                // hỏng các bước sau
                if (finalScore < matchedRubric.getMaxScore()) {
                    failedQuestionsSet.add(qNo);
                }
            }

            SubmissionDetail detail = SubmissionDetail.builder()
                    .submission(submission)
                    .rubric(matchedRubric)
                    .awardedScore(finalScore)
                    .aiFeedback(feedback)
                    .build();

            submissionDetailRepository.save(detail);
            totalScore += finalScore;
        }

        submission.setTotalScore(totalScore);
        submission.setStatus("GRADED");
        submissionRepository.save(submission);
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
