package com.hanoiprep.hses.lesson.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanoiprep.hses.chatbot.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Bóc tách và chuyển đổi nội dung tệp tin sang văn bản có cấu trúc:
 * - PDF Digital: Trích xuất trực tiếp bằng Apache PDFBox
 * - PDF Scan / Ảnh (PNG, JPG, JPEG): Trích xuất bằng Gemini Multimodal OCR
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentTextExtractor {

    private final GeminiService geminiService;
    private final TextNormalizer textNormalizer;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int MIN_TEXT_LENGTH_FOR_DIGITAL_PDF = 30;

    /**
     * Bóc tách toàn bộ nội dung văn bản từ một MultipartFile
     */
    public String extractText(MultipartFile file, String fileLabel) {
        if (file == null || file.isEmpty()) {
            return "";
        }

        try {
            byte[] bytes = file.getBytes();
            String originalFilename = file.getOriginalFilename();
            String mimeType = resolveMimeType(originalFilename);

            return extractTextFromBytes(bytes, originalFilename, mimeType, fileLabel);
        } catch (IOException e) {
            log.error("Lỗi đọc byte từ tệp tin [{}]: {}", fileLabel, e.getMessage());
            return "";
        }
    }

    /**
     * Bóc tách text từ mảng byte
     */
    public String extractTextFromBytes(byte[] bytes, String filename, String mimeType, String fileLabel) {
        if (bytes == null || bytes.length == 0) {
            return "";
        }

        // 1. Nếu là file PDF, thử trích xuất bằng PDFBox trước
        if ("application/pdf".equalsIgnoreCase(mimeType)) {
            String digitalPdfText = extractFromDigitalPdf(bytes);
            if (digitalPdfText != null && digitalPdfText.trim().length() >= MIN_TEXT_LENGTH_FOR_DIGITAL_PDF) {
                log.info("Trích xuất thành công {} ký tự từ Digital PDF [{}] qua PDFBox", digitalPdfText.length(), fileLabel);
                return textNormalizer.normalize(digitalPdfText);
            }
            log.info("PDF [{}] là dạng ảnh quét (Scanned PDF) hoặc ít chữ. Chuyển sang OCR bằng Gemini Vision...", fileLabel);
        }

        // 2. Nếu là Ảnh hoặc PDF Scan -> Sử dụng Gemini Multimodal OCR
        String ocrText = performGeminiOcr(bytes, mimeType, fileLabel);
        return textNormalizer.normalize(ocrText);
    }

    /**
     * Trích xuất văn bản từ PDF kỹ thuật số bằng PDFBox
     */
    private String extractFromDigitalPdf(byte[] pdfBytes) {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = stripper.getText(doc);
            return text != null ? text.trim() : null;
        } catch (Exception e) {
            log.warn("Không thể đọc text PDF qua PDFBox: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Dùng Gemini Multimodal để OCR trích xuất nội dung từ ảnh hoặc PDF scan
     */
    private String performGeminiOcr(byte[] mediaBytes, String mimeType, String fileLabel) {
        try {
            String ocrPrompt = """
                    Bạn là hệ thống OCR quang học chuyên dụng cho tài liệu giáo dục và bài tập.
                    Nhiệm vụ của bạn:
                    1. Đọc và nhận dạng toàn bộ chữ viết in, chữ viết tay, bảng biểu, công thức toán học/hóa học trong tài liệu đính kèm này.
                    2. Giữ nguyên cấu trúc thứ tự các câu hỏi (ví dụ: Câu 1, Câu 2, Bài 1, Hướng dẫn giải...).
                    3. Trả về dưới dạng JSON có trường "extractedText" chứa toàn bộ nội dung đã nhận diện.
                    """;

            String responseJson = geminiService.callGeminiWithMedia(ocrPrompt, mediaBytes, mimeType);
            JsonNode root = objectMapper.readTree(responseJson);

            // Bóc tách text từ response JSON của Gemini
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    String rawTextResponse = parts.get(0).path("text").asText("");
                    // Nếu Gemini trả về JSON string, parse để lấy extractedText
                    if (rawTextResponse.contains("extractedText")) {
                        try {
                            JsonNode parsedInner = objectMapper.readTree(rawTextResponse);
                            return parsedInner.path("extractedText").asText(rawTextResponse);
                        } catch (Exception ignored) {}
                    }
                    return rawTextResponse;
                }
            }
        } catch (Exception e) {
            log.warn("OCR qua Gemini cho tệp [{}] thất bại: {}", fileLabel, e.getMessage());
        }
        return "";
    }

    public String resolveMimeType(String filename) {
        if (filename == null) return "application/pdf";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        return "application/pdf";
    }
}
