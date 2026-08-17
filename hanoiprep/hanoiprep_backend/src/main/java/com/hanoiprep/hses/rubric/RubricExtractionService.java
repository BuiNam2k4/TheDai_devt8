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
    // ─────────────────────────────────────────────────────────────────────────
    // Bước 2: Gọi Gemini AI sinh rubrics chi tiết từ text hoặc PDF binary
    // ─────────────────────────────────────────────────────────────────────────
    private List<RubricDto> callGeminiForRubrics(Lesson lesson, String textContent, byte[] pdfBytes) throws Exception {
        String lessonTitle = (lesson.getTitle() != null && !lesson.getTitle().isBlank())
                ? lesson.getTitle()
                : "Bài tập tự luận";

        String solutionSection;
        if (textContent != null && !textContent.isBlank()) {
            solutionSection = """
                    ## NỘI DUNG ĐÁP ÁN / HƯỚNG DẪN GIẢI:
                    %s
                    """.formatted(textContent);
        } else {
            solutionSection = """
                    ## NỘI DUNG ĐÁP ÁN:
                    Vui lòng đọc và phân tích trực tiếp từ tài liệu PDF / hình ảnh barem đính kèm.
                    """;
        }

        String prompt = """
                ## NHIỆM VỤ THIẾT YẾU
                Bạn là một Hệ thống Trích xuất Barem Chấm thi Tự động chuyên nghiệp. Hãy phân tích tài liệu Đáp án / Hướng dẫn giải của bài học: "%s" và chuyển đổi thành danh sách các "Milestone Chấm Điểm" chuẩn xác.

                %s

                ## NGUYÊN TẮC XỬ LÝ CHẶT CHẼ
                1. **Bảo toàn cấu trúc & Số lượng bước (Strict 1-1 Mapping):**
                   - NẾU Barem đã chia sẵn bước/ý (ví dụ: Bước 1, Bước 2,... hoặc a, b, c): BẮT BUỘC trích xuất ĐẦY ĐỦ 1-1 từng bước đó. TUYỆT ĐỐI KHÔNG gộp bước, rút gọn hay bỏ sót.
                   - NẾU Barem là văn bản liền mạch: Tự động phân rã thành các bước giải logic rõ ràng theo nguyên tắc: 1 bước = 1 ý tính điểm.
                   - NẾU tài liệu scan có nét mờ / chữ xấu: Hãy suy luận theo mạch toán học chuẩn để hoàn thiện bước giải đầy đủ.

                2. **Thang điểm trung thực & Ràng buộc Tổng điểm (Score Integrity):**
                   - NẾU Barem ghi rõ điểm từng bước (vd: 0.25, 0.5, 0.75...): BẮT BUỘC lấy CHÍNH XÁC số điểm đó vào `maxScore`. TUYỆT ĐỐI KHÔNG chia đều điểm.
                   - NẾU Barem không ghi điểm từng bước: Tự phân bổ điểm hợp lý theo độ khó/khối lượng kiến thức của từng bước.
                   - **ĐIỀU KIỆN RÀNG BUỘC:** Tổng `maxScore` của toàn bộ các `stepOrder` trong cùng một `questionNo` BẮT BUỘC phải BẰNG TỔNG ĐIỂM của câu hỏi đó trong đề/đáp án gốc, và tổng toàn bài bằng 10.0.

                3. **Mô tả tiêu chí (`stepDescription`):** 
                   - Viết ngắn gọn, rõ ràng những gì học sinh CẦN ĐẠT ĐƯỢC để lấy điểm bước này.

                4. **Từ khóa & Kết quả chốt (`expectedLogicKeyword`):**
                   - Liệt kê 1-3 từ khóa kỹ thuật, công thức, biến đổi logic hoặc kết quả số học chốt (ví dụ: "x >= 1", "x = 3", "tam giác vuông tại A").

                ## VÍ DỤ MẪU BAREM CHUẨN (FEW-SHOT):
                [
                  {"questionNo": "Câu 1", "stepOrder": 1, "stepDescription": "Đặt điều kiện xác định x >= 1", "maxScore": 0.5, "expectedLogicKeyword": "x >= 1"},
                  {"questionNo": "Câu 1", "stepOrder": 2, "stepDescription": "Biến đổi phương trình về dạng x^2 - 4x + 3 = 0 và giải ra nghiệm", "maxScore": 1.0, "expectedLogicKeyword": "x^2 - 4x + 3 = 0"},
                  {"questionNo": "Câu 1", "stepOrder": 3, "stepDescription": "Đối chiếu điều kiện và kết luận tập nghiệm S = {3}", "maxScore": 0.5, "expectedLogicKeyword": "S = {3}, loại x = 1"},
                  {"questionNo": "Câu 2", "stepOrder": 1, "stepDescription": "Vẽ hình đúng và chứng minh tam giác ABC vuông tại A", "maxScore": 2.0, "expectedLogicKeyword": "tam giác ABC vuông tại A"}
                ]

                ## YÊU CẦU ĐỊNH DẠNG ĐẦU RA (STRICT OUTPUT)
                - Chỉ trả về duy nhất 1 chuỗi JSON Array hợp lệ.
                - KHÔNG bọc trong thẻ ```json ``` hoặc bất kỳ thẻ markdown nào khác.
                - KHÔNG chèn thêm bất kỳ lời chào, văn bản giải thích hay phản hồi nào ngoài JSON Array.
                """.formatted(lessonTitle, solutionSection);

        String rawResponse;
        if (pdfBytes != null && pdfBytes.length > 0) {
            rawResponse = geminiService.callGeminiWithMedia(prompt, pdfBytes, "application/pdf");
        } else {
            rawResponse = geminiService.callGemini(prompt);
        }

        JsonNode root = objectMapper.readTree(rawResponse);
        String coreJson = root.path("candidates").get(0)
                .path("content").path("parts").get(0)
                .path("text").asText();

        coreJson = extractJsonArray(coreJson);

        List<RubricDto> dtos = objectMapper.readValue(coreJson, new TypeReference<>() {
        });

        if (dtos == null || dtos.isEmpty()) {
            throw new RuntimeException("Gemini returned empty rubric list");
        }

        // Lọc và làm sạch điểm số âm / null
        for (RubricDto dto : dtos) {
            if (dto.getMaxScore() == null || dto.getMaxScore() <= 0) {
                dto.setMaxScore(0.5);
            }
        }

        double total = dtos.stream().mapToDouble(RubricDto::getMaxScore).sum();
        if (total <= 0) {
            throw new RuntimeException("Total rubric score is invalid (<= 0)");
        }

        // Normalize: Đảm bảo tổng điểm bài thi luôn bằng chính xác 10.0
        if (Math.abs(total - 10.0) > 0.01) {
            log.warn("Rubric total score is {} (expected 10.0) for lesson {}. Normalizing...", total, lesson.getId());
            final double factor = 10.0 / total;
            for (RubricDto d : dtos) {
                double scaled = Math.round(d.getMaxScore() * factor * 100.0) / 100.0;
                d.setMaxScore(Math.max(0.1, scaled));
            }
        }

        log.info("Successfully generated {} rubric steps for lesson {} (total score: {})",
                dtos.size(), lesson.getId(), dtos.stream().mapToDouble(RubricDto::getMaxScore).sum());
        return dtos;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Bước 3: Xóa tiêu chí cũ/mẫu, lưu Rubrics mới vào DB bằng saveAll()
    // ─────────────────────────────────────────────────────────────────────────
    private List<Rubric> saveRubrics(Lesson lesson, List<RubricDto> dtos) {
        // Xóa SubmissionDetail liên kết với rubric cũ trước (tránh FK violation)
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

        // 1. Loại bỏ các khối markdown wrapper (```json ... ``` hoặc ``` ...)
        if (text.startsWith("```json"))
            text = text.substring(7);
        else if (text.startsWith("```"))
            text = text.substring(3);
        if (text.endsWith("```"))
            text = text.substring(0, text.length() - 3);
        text = text.trim();

        // 2. Tìm cặp ngoặc mảng JSON [...] ngoài cùng
        int start = text.indexOf('[');
        int end = text.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            String candidate = text.substring(start, end + 1).trim();
            // Loại bỏ dấu phẩy thừa trước ngoặc đóng (trailing comma) nếu có
            candidate = candidate.replaceAll(",\\s*\\]", "]");
            try {
                objectMapper.readTree(candidate);
                return candidate;
            } catch (Exception ignored) {
            }
        }

        // 3. Fallback: Regex trích xuất tất cả các đối tượng JSON {...} hoàn chỉnh hợp lệ
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
