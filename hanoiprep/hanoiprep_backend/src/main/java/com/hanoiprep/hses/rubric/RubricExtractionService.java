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
 * Dịch vụ tự động trích xuất Rubric (tiêu chí chấm điểm) từ file đáp án PDF /
 * nội dung đáp án
 * bằng cách:
 * 1. Đọc text từ PDF (PDFBox) hoặc URL Cloudinary hoặc solutionSteps
 * 2. Xóa toàn bộ tiêu chí cũ/mẫu của bài học đó
 * 3. Gửi Gemini AI prompt phân tích -> sinh rubric JSON mới
 * 4. Normalize tổng điểm về đúng 10.0
 * 5. Lưu Rubrics mới vào DB bằng saveAll()
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
        rt.getMessageConverters().add(0, new org.springframework.http.converter.StringHttpMessageConverter(
                java.nio.charset.StandardCharsets.UTF_8));
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
     * Trích xuất text hoặc gửi PDF binary sang Gemini Multimodal, lưu rubrics cho
     * lesson.
     */
    @Transactional
    public List<Rubric> extractAndSaveRubrics(Lesson lesson, MultipartFile solutionFile) {
        if (solutionFile == null || solutionFile.isEmpty()) {
            return extractAndSaveRubricsFromLessonEntity(lesson);
        }

        try {
            byte[] pdfBytes = solutionFile.getBytes();
            String pdfText = extractTextFromPdf(pdfBytes);

            log.info("Processing solution PDF ({} bytes, {} extracted text chars) for lesson {}...",
                    pdfBytes.length, pdfText != null ? pdfText.length() : 0, lesson.getId());

            List<RubricDto> rubricDtos;
            if (pdfText != null && pdfText.trim().length() >= 100) {
                // PDF dạng văn bản có text rõ ràng
                rubricDtos = callGeminiForRubrics(lesson, pdfText, null);
            } else {
                // PDF dạng ảnh scan / viết tay -> gửi trực tiếp file PDF binary qua Gemini
                // Multimodal
                log.info("PDF text is sparse or scanned. Using Gemini Multimodal for lesson {}...", lesson.getId());
                rubricDtos = callGeminiForRubrics(lesson, null, pdfBytes);
            }

            return saveRubrics(lesson, rubricDtos);
        } catch (Exception e) {
            log.error("Gemini rubric extraction failed for lesson {}: {}", lesson.getId(), e.getMessage());
            return extractAndSaveRubricsFromLessonEntity(lesson);
        }
    }

    /**
     * Trích xuất từ Lesson entity (tải PDF từ Cloudinary hoặc dùng solutionSteps /
     * contentText),
     * tự động sinh Rubrics mới từ AI và lưu vào DB.
     */
    @Transactional
    public List<Rubric> extractAndSaveRubricsFromLessonEntity(Lesson lesson) {
        String solutionText = null;
        byte[] pdfBytes = null;

        // 1. Thử tải PDF từ URL Cloudinary (nếu có)
        if (lesson.getSolutionFileUrl() != null && !lesson.getSolutionFileUrl().isBlank()) {
            try {
                pdfBytes = restTemplate.getForObject(lesson.getSolutionFileUrl(), byte[].class);
                if (pdfBytes != null && pdfBytes.length > 0) {
                    solutionText = extractTextFromPdf(pdfBytes);
                }
            } catch (Exception e) {
                log.warn("Could not download solution PDF from URL [{}]: {}", lesson.getSolutionFileUrl(),
                        e.getMessage());
            }
        }

        // 2. Nếu không có PDF hoặc không tải được, dùng solutionSteps hoặc contentText
        if ((pdfBytes == null || pdfBytes.length == 0) && (solutionText == null || solutionText.isBlank())) {
            if (lesson.getSolutionSteps() != null && !lesson.getSolutionSteps().isBlank()) {
                solutionText = lesson.getSolutionSteps();
            } else if (lesson.getContentText() != null && !lesson.getContentText().isBlank()) {
                solutionText = lesson.getContentText();
            } else {
                solutionText = "Bài tập " + (lesson.getTitle() != null ? lesson.getTitle() : "");
            }
        }

        try {
            List<RubricDto> rubricDtos;
            if (pdfBytes != null && pdfBytes.length > 0
                    && (solutionText == null || solutionText.trim().length() < 80)) {
                // Sử dụng Multimodal với PDF binary từ Cloudinary
                log.info("Calling Gemini Multimodal with Cloudinary PDF ({} bytes) for lesson {}...", pdfBytes.length,
                        lesson.getId());
                rubricDtos = callGeminiForRubrics(lesson, null, pdfBytes);
            } else {
                log.info("Calling Gemini with text ({} chars) for lesson {}...",
                        solutionText != null ? solutionText.length() : 0, lesson.getId());
                rubricDtos = callGeminiForRubrics(lesson, solutionText, null);
            }
            return saveRubrics(lesson, rubricDtos);
        } catch (Exception e) {
            log.error("Fallback rubric generation failed for lesson {}: {}", lesson.getId(), e.getMessage());
            return createDefaultRubric(lesson);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bước 1: Trích xuất text từ PDF bytes bằng Apache PDFBox
    // ─────────────────────────────────────────────────────────────────────────
    private String extractTextFromPdf(byte[] pdfBytes) {
        if (pdfBytes == null || pdfBytes.length == 0)
            return null;
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(doc);
            if (text != null) {
                text = text.trim();
                return text.length() > 10000 ? text.substring(0, 10000) + "\n...(nội dung còn tiếp)" : text;
            }
            return null;
        } catch (Exception e) {
            log.warn("Failed to extract text from PDF bytes via PDFBox: {}", e.getMessage());
            return null;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bước 2: Gọi Gemini AI sinh rubrics chi tiết từ text hoặc PDF binary
    // ─────────────────────────────────────────────────────────────────────────
    private List<RubricDto> callGeminiForRubrics(Lesson lesson, String textContent, byte[] pdfBytes) throws Exception {
        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append(
                "Bạn là chuyên gia khảo thí và sư phạm xây dựng thang điểm (rubric) cho bài tập/đề thi THPT.\n\n");
        promptBuilder.append("## THÔNG TIN BÀI HỌC\n");
        promptBuilder.append("Tên bài: ").append(lesson.getTitle() != null ? lesson.getTitle() : "Bài tập tự luận")
                .append("\n\n");

        if (textContent != null && !textContent.isBlank()) {
            promptBuilder.append("## NỘI DUNG ĐÁP ÁN / HƯỚNG DẪN GIẢI\n");
            promptBuilder.append(textContent).append("\n\n");
        } else {
            promptBuilder.append("## NỘI DUNG ĐÁP ÁN: Vui lòng đọc trực tiếp từ tài liệu PDF/ảnh đính kèm.\n\n");
        }

        promptBuilder.append("## NHIỆM VỤ QUAN TRỌNG\n")
                .append("1. Phân tích cấu trúc: Xác định bài thi gồm bao nhiêu Câu/Bài riêng biệt (ví dụ: 'Câu 1', 'Câu 2', 'Câu 3'... hoặc 'Bài 1', 'Bài 2'...). NẾU bài thi có nhiều câu, TUYỆT ĐỐI PHẢI tách thành từng câu tương ứng.\n")
                .append("2. Phân chia bước giải: Với MỖI Câu/Bài, chia quá trình giải thành các BƯỚC LOGIC CỤ THỂ (thường 2 - 4 bước mỗi câu, ví dụ: Bước 1: Điều kiện & thiết lập phương trình, Bước 2: Biến đổi trung gian, Bước 3: Tính nghiệm và kết luận).\n")
                .append("3. Mô tả tiêu chí: Mỗi bước phải mô tả RÕ RÀNG học sinh cần làm gì để đạt điểm (không ghi chung chung như 'làm đúng').\n")
                .append("4. Phân bổ điểm: Điểm của từng bước (maxScore) phải hợp lý. TỔNG ĐIỂM TẤT CẢ CÁC BƯỚC CỦA TOÀN BÀI PHẢI BẰNG ĐÚNG 10.0 ĐIỂM.\n")
                .append("5. Từ khóa kỹ thuật (expectedLogicKeyword): Liệt kê 1-3 từ khóa/công thức/kết quả cần tìm thấy trong bước đó.\n\n")
                .append("## ĐỊNH DẠNG ĐẦU RA BẮT BUỘC:\n")
                .append("Chỉ trả về JSON Array thuần túy, KHÔNG bọc trong markdown ```json, KHÔNG có bất kỳ văn bản giải thích nào khác:\n")
                .append("[\n")
                .append("  {\"questionNo\": \"Câu 1\", \"stepOrder\": 1, \"stepDescription\": \"<mô tả tiêu chí bước 1>\", \"maxScore\": 1.5, \"expectedLogicKeyword\": \"<từ khóa>\"},\n")
                .append("  {\"questionNo\": \"Câu 1\", \"stepOrder\": 2, \"stepDescription\": \"<mô tả tiêu chí bước 2>\", \"maxScore\": 1.5, \"expectedLogicKeyword\": \"<từ khóa>\"}\n")
                .append("]");

        String rawResponse;
        if (pdfBytes != null && pdfBytes.length > 0) {
            rawResponse = geminiService.callGeminiWithMedia(promptBuilder.toString(), pdfBytes, "application/pdf");
        } else {
            rawResponse = geminiService.callGemini(promptBuilder.toString());
        }

        JsonNode root = objectMapper.readTree(rawResponse);
        String coreJson = root.path("candidates").get(0)
                .path("content").path("parts").get(0)
                .path("text").asText();

        coreJson = extractJsonArray(coreJson);

        List<RubricDto> dtos = objectMapper.readValue(coreJson, new TypeReference<>() {
        });

        double total = dtos.stream().mapToDouble(d -> d.getMaxScore() != null ? d.getMaxScore() : 0).sum();
        if (dtos.isEmpty() || total <= 0) {
            throw new RuntimeException("Gemini returned invalid rubric data (empty or zero total score)");
        }

        // Normalize: đảm bảo tổng điểm chính xác = 10.0
        if (Math.abs(total - 10.0) > 0.01) {
            log.warn("Rubric total score is {} (expected 10.0) for lesson {}. Normalizing...", total, lesson.getId());
            final double factor = 10.0 / total;
            dtos.forEach(d -> {
                if (d.getMaxScore() != null) {
                    // Làm tròn 2 chữ số thập phân
                    d.setMaxScore(Math.round(d.getMaxScore() * factor * 100.0) / 100.0);
                }
            });
        }

        log.info("Successfully generated {} rubric steps for lesson {} (normalized total = 10.0)", dtos.size(),
                lesson.getId());
        return dtos;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bước 3: Xóa tiêu chí cũ/mẫu, lưu Rubrics mới vào DB bằng saveAll()
    // ─────────────────────────────────────────────────────────────────────────
    private List<Rubric> saveRubrics(Lesson lesson, List<RubricDto> dtos) {
        // Xóa SubmissionDetail liên kết với rubric cũ trước (tránh FK violation)
        // Dùng deleteByRubricId() thay vì findAll() để tránh load toàn bộ bảng vào RAM
        try {
            List<Rubric> oldRubrics = rubricRepository.findByLessonId(lesson.getId());
            for (Rubric oldR : oldRubrics) {
                try {
                    submissionDetailRepository.deleteByRubricId(oldR.getId());
                } catch (Exception ignored) {
                }
            }
            rubricRepository.deleteByLessonId(lesson.getId());
            log.info("Cleared {} old rubrics for lesson {}", oldRubrics.size(), lesson.getId());
        } catch (Exception e) {
            log.warn("Could not delete old rubrics for lesson {}: {}", lesson.getId(), e.getMessage());
        }

        // Tạo và lưu rubric mới bằng saveAll() — chỉ 1 batch DB roundtrip
        List<Rubric> toSave = new ArrayList<>();
        for (int i = 0; i < dtos.size(); i++) {
            RubricDto dto = dtos.get(i);
            toSave.add(Rubric.builder()
                    .lesson(lesson)
                    .questionNo(dto.getQuestionNo() != null && !dto.getQuestionNo().isBlank()
                            ? dto.getQuestionNo()
                            : "Câu 1")
                    .stepOrder(dto.getStepOrder() != null ? dto.getStepOrder() : i + 1)
                    .stepDescription(dto.getStepDescription())
                    .maxScore(dto.getMaxScore())
                    .expectedLogicKeyword(dto.getExpectedLogicKeyword())
                    .build());
        }

        List<Rubric> saved = rubricRepository.saveAll(toSave);
        log.info("Saved {} new AI-extracted rubrics for lesson {}", saved.size(), lesson.getId());
        return saved;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fallback: tạo 1 rubric tổng khi không đọc được PDF hoặc AI lỗi
    // ─────────────────────────────────────────────────────────────────────────
    private List<Rubric> createDefaultRubric(Lesson lesson) {
        try {
            rubricRepository.deleteByLessonId(lesson.getId());
        } catch (Exception ignored) {
        }

        Rubric rubric = Rubric.builder()
                .lesson(lesson)
                .questionNo("Câu 1")
                .stepOrder(1)
                .stepDescription("Đánh giá tổng thể bài làm dựa trên nội dung đáp án bài học")
                .maxScore(10.0)
                .expectedLogicKeyword("")
                .build();
        return List.of(rubricRepository.save(rubric));
    }

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
