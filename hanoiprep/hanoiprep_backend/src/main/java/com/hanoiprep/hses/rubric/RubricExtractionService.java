package com.hanoiprep.hses.rubric;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanoiprep.hses.chatbot.GeminiService;
import com.hanoiprep.hses.lesson.Lesson;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Dịch vụ tự động trích xuất Rubric (tiêu chí chấm điểm) từ file đáp án PDF / nội dung đáp án
 * bằng cách:
 *   1. Đọc text từ PDF (PDFBox) hoặc URL Cloudinary hoặc solutionSteps
 *   2. Xóa toàn bộ tiêu chí cũ/mẫu của bài học đó
 *   3. Gửi Gemini AI prompt phân tích -> sinh rubric JSON mới
 *   4. Lưu Rubrics mới vào DB
 */
@Service
@RequiredArgsConstructor
public class RubricExtractionService {

    private static final Logger log = LoggerFactory.getLogger(RubricExtractionService.class);

    private final GeminiService geminiService;
    private final RubricRepository rubricRepository;
    private final com.hanoiprep.hses.submission.SubmissionDetailRepository submissionDetailRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = createUtf8RestTemplate();

    private static RestTemplate createUtf8RestTemplate() {
        RestTemplate rt = new RestTemplate();
        rt.getMessageConverters().add(0, new org.springframework.http.converter.StringHttpMessageConverter(java.nio.charset.StandardCharsets.UTF_8));
        return rt;
    }

    /** DTO nhận từ Gemini */
    @Data
    public static class RubricDto {
        private String questionNo;
        private Integer stepOrder;
        private String stepDescription;
        private Double maxScore;
        private String expectedLogicKeyword;
    }

    /**
     * Trích xuất text từ MultipartFile PDF, gọi Gemini AI, lưu rubrics cho lesson.
     */
    @Transactional
    public List<Rubric> extractAndSaveRubrics(Lesson lesson, MultipartFile solutionFile) {
        String pdfText = extractTextFromPdf(solutionFile);

        if (pdfText == null || pdfText.isBlank()) {
            return extractAndSaveRubricsFromLessonEntity(lesson);
        }

        log.info("Extracted {} chars from solution PDF for lesson {}. Calling Gemini...", pdfText.length(), lesson.getId());

        try {
            List<RubricDto> rubricDtos = callGeminiForRubrics(lesson, pdfText);
            return saveRubrics(lesson, rubricDtos);
        } catch (Exception e) {
            log.error("Gemini rubric extraction failed for lesson {}: {}", lesson.getId(), e.getMessage());
            return extractAndSaveRubricsFromLessonEntity(lesson);
        }
    }

    /**
     * Trích xuất text từ Lesson entity (solutionFileUrl PDF trên Cloudinary hoặc solutionSteps / contentText),
     * tự động sinh Rubrics mới từ AI và lưu vào DB.
     */
    @Transactional
    public List<Rubric> extractAndSaveRubricsFromLessonEntity(Lesson lesson) {
        String solutionText = null;

        // 1. Thử tải PDF từ URL Cloudinary (nếu có)
        if (lesson.getSolutionFileUrl() != null && !lesson.getSolutionFileUrl().isBlank()) {
            try {
                byte[] pdfBytes = restTemplate.getForObject(lesson.getSolutionFileUrl(), byte[].class);
                if (pdfBytes != null && pdfBytes.length > 0) {
                    try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
                        PDFTextStripper stripper = new PDFTextStripper();
                        solutionText = stripper.getText(doc).trim();
                    }
                }
            } catch (Exception e) {
                log.warn("Could not download/parse solution PDF from URL [{}]: {}", lesson.getSolutionFileUrl(), e.getMessage());
            }
        }

        // 2. Nếu không đọc được PDF, dùng solutionSteps hoặc contentText
        if (solutionText == null || solutionText.isBlank()) {
            if (lesson.getSolutionSteps() != null && !lesson.getSolutionSteps().isBlank()) {
                solutionText = lesson.getSolutionSteps();
            } else if (lesson.getContentText() != null && !lesson.getContentText().isBlank()) {
                solutionText = lesson.getContentText();
            } else {
                solutionText = "Bài tập " + lesson.getTitle();
            }
        }

        log.info("Generating rubrics from solution text ({} chars) for lesson {}...", solutionText.length(), lesson.getId());

        try {
            List<RubricDto> rubricDtos = callGeminiForRubrics(lesson, solutionText);
            return saveRubrics(lesson, rubricDtos);
        } catch (Exception e) {
            log.error("Fallback rubric generation failed for lesson {}: {}", lesson.getId(), e.getMessage());
            return createDefaultRubric(lesson);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bước 1: Trích xuất text từ PDF MultipartFile bằng PDFBox
    // ─────────────────────────────────────────────────────────────────────────
    private String extractTextFromPdf(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        try {
            byte[] bytes = file.getBytes();
            try (PDDocument doc = Loader.loadPDF(bytes)) {
                PDFTextStripper stripper = new PDFTextStripper();
                String text = stripper.getText(doc);
                return text.length() > 8000 ? text.substring(0, 8000) + "\n...(nội dung còn tiếp)" : text;
            }
        } catch (IOException e) {
            log.error("Failed to extract text from PDF file: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bước 2: Gọi Gemini AI sinh rubrics từ text đáp án
    // ─────────────────────────────────────────────────────────────────────────
    private List<RubricDto> callGeminiForRubrics(Lesson lesson, String textContent) throws Exception {
        String prompt = "Bạn là chuyên gia giáo dục. Tôi sẽ cung cấp nội dung đáp án / hướng dẫn giải của một bài thi.\n" +
                "Bài thi có thể chứa một hoặc nhiều Bài/Câu (ví dụ: Bài 1 - Câu a, Bài 1 - Câu b, Bài 2...).\n" +
                "Nhiệm vụ của bạn là phân tích đáp án và tạo ra danh sách các TIÊU CHÍ CHẤM ĐIỂM (rubric) chi tiết PHÂN THEO TỪNG BÀI/CÂU.\n\n" +
                "BÀI HỌC: " + (lesson.getTitle() != null ? lesson.getTitle() : "") + "\n\n" +
                "NỘI DUNG ĐÁP ÁN:\n" + textContent + "\n\n" +
                "Yêu cầu:\n" +
                "- Phân nhóm tiêu chí theo từng Bài/Câu. Trường questionNo thể hiện tên bài/câu (VD: 'Bài 1 - Câu a', 'Bài 1 - Câu b', 'Bài 2'...)\n" +
                "- Trong mỗi Bài/Câu, chia nhỏ thành CÁC BƯỚC cụ thể (stepOrder = 1, 2, 3...)\n" +
                "- THANG ĐIỂM TỔNG TOÀN BÀI LÀ 10. Điểm được chia đều hợp lý cho từng bước của các câu.\n" +
                "- Mỗi stepDescription phải mô tả rõ ràng yêu cầu của bước đó.\n" +
                "- expectedLogicKeyword: từ khóa kỹ thuật chính cần có trong bước đó.\n\n" +
                "Chỉ trả về JSON array nguyên chất, KHÔNG có markdown:\n" +
                "[{\"questionNo\": \"Bài 1 - Câu a\", \"stepOrder\": 1, \"stepDescription\": \"<mô tả tiêu chí>\", " +
                "\"maxScore\": <điểm_số>, \"expectedLogicKeyword\": \"<từ_khóa>\"}]";

        String rawResponse = geminiService.callGemini(prompt);

        JsonNode root = objectMapper.readTree(rawResponse);
        String coreJson = root.path("candidates").get(0)
                              .path("content").path("parts").get(0)
                              .path("text").asText();

        coreJson = extractJsonArray(coreJson);

        List<RubricDto> dtos = objectMapper.readValue(coreJson, new TypeReference<>() {});

        double total = dtos.stream().mapToDouble(d -> d.getMaxScore() != null ? d.getMaxScore() : 0).sum();
        if (dtos.isEmpty() || total <= 0) {
            throw new RuntimeException("Gemini returned invalid rubric data");
        }

        return dtos;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bước 3: Xóa tiêu chí cũ/mẫu, lưu Rubrics mới vào DB
    // ─────────────────────────────────────────────────────────────────────────
    private List<Rubric> saveRubrics(Lesson lesson, List<RubricDto> dtos) {
        // QUAN TRỌNG: Xóa toàn bộ tiêu chí mẫu/cũ của bài học này trước khi lưu tiêu chí mới từ AI!
        try {
            List<Rubric> oldRubrics = rubricRepository.findByLessonId(lesson.getId());
            for (Rubric oldR : oldRubrics) {
                try {
                    // Xóa các chi tiết bài nộp cũ liên quan đến tiêu chí này
                    submissionDetailRepository.findAll().stream()
                            .filter(d -> d.getRubric() != null && d.getRubric().getId().equals(oldR.getId()))
                            .forEach(d -> {
                                d.setRubric(null);
                                submissionDetailRepository.save(d);
                            });
                } catch (Exception ignored) {}
            }
            rubricRepository.deleteByLessonId(lesson.getId());
            log.info("Cleared old/sample rubrics for lesson {}", lesson.getId());
        } catch (Exception e) {
            log.warn("Could not delete old rubrics for lesson {}: {}", lesson.getId(), e.getMessage());
        }

        List<Rubric> saved = new ArrayList<>();
        for (int i = 0; i < dtos.size(); i++) {
            RubricDto dto = dtos.get(i);
            Rubric rubric = Rubric.builder()
                    .lesson(lesson)
                    .questionNo(dto.getQuestionNo() != null && !dto.getQuestionNo().isBlank() ? dto.getQuestionNo() : "Bài 1")
                    .stepOrder(dto.getStepOrder() != null ? dto.getStepOrder() : i + 1)
                    .stepDescription(dto.getStepDescription())
                    .maxScore(dto.getMaxScore())
                    .expectedLogicKeyword(dto.getExpectedLogicKeyword())
                    .build();
            saved.add(rubricRepository.save(rubric));
        }
        log.info("Saved {} new AI-extracted rubrics for lesson {}", saved.size(), lesson.getId());
        return saved;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fallback: tạo 1 rubric tổng khi không đọc được PDF hoặc AI lỗi
    // ─────────────────────────────────────────────────────────────────────────
    private List<Rubric> createDefaultRubric(Lesson lesson) {
        try {
            rubricRepository.deleteByLessonId(lesson.getId());
        } catch (Exception ignored) {}

        Rubric rubric = Rubric.builder()
                .lesson(lesson)
                .stepOrder(1)
                .stepDescription("Đánh giá tổng thể bài làm dựa trên nội dung đáp án bài học")
                .maxScore(10.0)
                .expectedLogicKeyword("")
                .build();
        return List.of(rubricRepository.save(rubric));
    }

    private String extractJsonArray(String text) {
        if (text == null) return "[]";
        text = text.trim();

        if (text.startsWith("```json")) text = text.substring(7);
        else if (text.startsWith("```")) text = text.substring(3);
        if (text.endsWith("```")) text = text.substring(0, text.length() - 3);
        text = text.trim();

        int start = text.indexOf('[');
        int end = text.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            String candidate = text.substring(start, end + 1);
            try {
                objectMapper.readTree(candidate);
                return candidate;
            } catch (Exception ignored) {}
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
            } catch (Exception ignored) {}
        }

        if (!validObjects.isEmpty()) {
            return "[" + String.join(",", validObjects) + "]";
        }

        return "[]";
    }
}
