package com.hanoiprep.hses.lesson.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanoiprep.hses.chatbot.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Bóc tách và chuyển đổi nội dung tệp tin sang văn bản có cấu trúc:
 * - PDF Digital: Trích xuất trực tiếp bằng Apache PDFBox
 * - PDF Scan / Ảnh (PNG, JPG, JPEG): Render sang ảnh và trích xuất bằng Gemini
 * Multimodal OCR
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DocumentTextExtractor {

    private final GeminiService geminiService;
    private final TextNormalizer textNormalizer;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Ngưỡng tối thiểu để coi PDF là dạng digital (có text layer thực sự)
    // Phải đủ dài và có nghĩa sau khi chuẩn hóa, nếu không sẽ dùng OCR Gemini Vision
    private static final int MIN_TEXT_LENGTH_FOR_DIGITAL_PDF = 50;

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
            String detectedMimeType = detectActualMimeType(bytes, originalFilename);

            log.info("Trích xuất văn bản tệp [{}] (filename='{}', detectedMimeType={}, size={}bytes)",
                    fileLabel, originalFilename, detectedMimeType, bytes.length);

            return extractTextFromBytes(bytes, originalFilename, detectedMimeType, fileLabel);
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

        // Tự động chuẩn hóa mimeType thực tế dựa trên magic bytes của dữ liệu
        String actualMimeType = (mimeType != null && !mimeType.isBlank())
                ? mimeType
                : detectActualMimeType(bytes, filename);

        // 1. Nếu là file PDF, thử trích xuất bằng PDFBox text trước (Digital PDF)
        if ("application/pdf".equalsIgnoreCase(actualMimeType)) {
            String digitalPdfText = extractFromDigitalPdf(bytes);
            String normalizedPdfText = digitalPdfText != null ? textNormalizer.normalize(digitalPdfText) : "";
            if (normalizedPdfText.length() >= MIN_TEXT_LENGTH_FOR_DIGITAL_PDF) {
                log.info("Trích xuất thành công {} ký tự từ Digital PDF [{}] qua PDFBox", normalizedPdfText.length(),
                        fileLabel);
                return normalizedPdfText;
            }
            log.info(
                    "PDF [{}] là dạng ảnh quét/bảng biểu (chỉ được {} ký tự từ PDFBox). Gửi trực tiếp PDF tới Gemini Vision OCR...",
                    fileLabel, normalizedPdfText.length());

            // Gửi trực tiếp toàn bộ PDF binary tới Gemini
            String ocrText = performGeminiOcr(bytes, "application/pdf", fileLabel);
            if (ocrText != null && !ocrText.isBlank()) {
                return textNormalizer.normalize(ocrText);
            }

            // Fallback: Render các trang sang ảnh PNG nếu gửi PDF trực tiếp không thành công
            log.warn("Thử fallback render PDF [{}] sang ảnh PNG để OCR...", fileLabel);
            byte[] pngBytes = convertPdfToPngBytes(bytes);
            if (pngBytes != null && pngBytes.length > 0) {
                String fallbackOcr = performGeminiOcr(pngBytes, "image/png", fileLabel);
                if (fallbackOcr != null && !fallbackOcr.isBlank()) {
                    return textNormalizer.normalize(fallbackOcr);
                }
            }

            return normalizedPdfText;
        }

        // 2. Nếu là file Word (.docx) hoặc file ZIP chứa XML
        if ("application/vnd.openxmlformats-officedocument.wordprocessingml.document".equalsIgnoreCase(actualMimeType)) {
            String docxText = extractTextFromDocx(bytes);
            if (docxText != null && !docxText.isBlank()) {
                log.info("Trích xuất thành công {} ký tự từ tài liệu Word/DOCX [{}]", docxText.length(), fileLabel);
                return docxText;
            }
        }

        // 3. Nếu là Ảnh hoặc các định dạng media khác -> Sử dụng Gemini Multimodal OCR
        String ocrText = performGeminiOcr(bytes, actualMimeType, fileLabel);
        return textNormalizer.normalize(ocrText);
    }

    /**
     * Tự động trích xuất văn bản từ tài liệu DOCX
     */
    private String extractTextFromDocx(byte[] bytes) {
        try (java.util.zip.ZipInputStream zis = new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(bytes))) {
            java.util.zip.ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if ("word/document.xml".equalsIgnoreCase(entry.getName())) {
                    byte[] buffer = zis.readAllBytes();
                    String xml = new String(buffer, java.nio.charset.StandardCharsets.UTF_8);
                    // Bỏ các thẻ XML, giữ lại ngắt dòng giữa các đoạn văn
                    String text = xml.replaceAll("<w:p[ >]", "\n").replaceAll("<[^>]+>", " ");
                    return textNormalizer.normalize(text);
                }
            }
        } catch (Exception e) {
            log.warn("Không thể giải mã nội dung file DOCX: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Tự động nhận diện định dạng file thực sự từ Magic Bytes (File Signatures)
     */
    public String detectActualMimeType(byte[] bytes, String filename) {
        if (bytes == null || bytes.length < 4) {
            return resolveMimeType(filename);
        }

        // In 8 byte đầu dạng Hex để kiểm tra định dạng
        if (log.isDebugEnabled() || log.isInfoEnabled()) {
            StringBuilder hex = new StringBuilder();
            int limit = Math.min(bytes.length, 8);
            for (int i = 0; i < limit; i++) {
                hex.append(String.format("%02X ", bytes[i]));
            }
            log.info("File header bytes [{}]: {}", filename, hex.toString().trim());
        }

        // 1. PDF Magic Bytes: %PDF (0x25, 0x50, 0x44, 0x46)
        if (bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 && bytes[3] == 0x46) {
            return "application/pdf";
        }

        // 2. PNG Magic Bytes: 0x89, 0x50, 0x4E, 0x47
        if ((bytes[0] & 0xFF) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) {
            return "image/png";
        }

        // 3. JPEG Magic Bytes: 0xFF, 0xD8, 0xFF
        if ((bytes[0] & 0xFF) == 0xFF && (bytes[1] & 0xFF) == 0xD8 && (bytes[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }

        // 4. GIF Magic Bytes: GIF8
        if (bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == '8') {
            return "image/gif";
        }

        // 5. WebP Magic Bytes: RIFF....WEBP
        if (bytes.length >= 12 && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "image/webp";
        }

        // 6. DOCX / ZIP Magic Bytes: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
        if (bytes[0] == 0x50 && bytes[1] == 0x4B && bytes[2] == 0x03 && bytes[3] == 0x04) {
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }

        // Fallback theo phần mở rộng tên file
        return resolveMimeType(filename);
    }

    /**
     * Render các trang PDF sang ảnh PNG bytes để gửi tới Gemini Vision
     */
    private byte[] convertPdfToPngBytes(byte[] pdfBytes) {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            int numPages = doc.getNumberOfPages();
            if (numPages == 0)
                return null;

            PDFRenderer renderer = new PDFRenderer(doc);
            int pageCount = Math.min(numPages, 3); // Lấy tối đa 3 trang đầu

            if (pageCount == 1) {
                BufferedImage bim = renderer.renderImageWithDPI(0, 150);
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(bim, "png", baos);
                return baos.toByteArray();
            } else {
                List<BufferedImage> images = new ArrayList<>();
                int totalHeight = 0;
                int maxWidth = 0;
                for (int i = 0; i < pageCount; i++) {
                    BufferedImage img = renderer.renderImageWithDPI(i, 130);
                    images.add(img);
                    totalHeight += img.getHeight();
                    maxWidth = Math.max(maxWidth, img.getWidth());
                }
                BufferedImage combined = new BufferedImage(maxWidth, totalHeight, BufferedImage.TYPE_INT_RGB);
                var g = combined.createGraphics();
                int currentY = 0;
                for (BufferedImage img : images) {
                    g.drawImage(img, 0, currentY, null);
                    currentY += img.getHeight();
                }
                g.dispose();
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                ImageIO.write(combined, "png", baos);
                return baos.toByteArray();
            }
        } catch (Exception e) {
            log.warn("Không thể render PDF sang ảnh PNG qua PDFBox: {}", e.getMessage());
            return null;
        }
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
            log.info("Bắt đầu OCR Gemini cho tệp [{}] - mimeType={}, size={}bytes", fileLabel, mimeType, mediaBytes.length);
            String ocrPrompt = """
                    Hãy đọc và sao chép toàn bộ nội dung có trong tài liệu đính kèm.
                    
                    Tài liệu này có thể là đề thi, bài giải, hoặc bảng chấm điểm gồm bảng biểu với các cột: Câu hỏi, Bước giải, Đáp án, Điểm.
                    
                    Yêu cầu:
                    1. Sao chép nguyên vẹn chữ in, chữ viết tay, nội dung trong từng ô bảng, công thức toán/hóa học.
                    2. Với bảng biểu: ghi rõ tiêu đề cột, sau đó liệt kê từng hàng theo định dạng: Câu X: [nội dung] | Bước: [bước giải] | Điểm: [số điểm].
                    3. Giữ nguyên thứ tự câu hỏi (Câu 1, Câu 2, Bài 1...).
                    4. Chỉ trả về toàn bộ nội dung đã sao chép, KHÔNG giải thích hay tóm tắt.
                    """;

            String rawResponse = geminiService.callGeminiWithMedia(ocrPrompt, mediaBytes, mimeType);
            if (rawResponse == null || rawResponse.isBlank()) {
                log.warn("OCR Gemini trả về rỗng cho tệp [{}]", fileLabel);
                return "";
            }

            // Parse toàn bộ text từ candidates[0].content.parts trong response JSON của Gemini API
            JsonNode root = objectMapper.readTree(rawResponse);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    StringBuilder sb = new StringBuilder();
                    for (JsonNode part : parts) {
                        String txt = part.path("text").asText("");
                        if (!txt.isBlank()) {
                            sb.append(txt).append("\n");
                        }
                    }
                    String rawTextResponse = sb.toString().trim();
                    log.info("OCR Gemini thành công cho tệp [{}] - trích xuất {} ký tự", fileLabel, rawTextResponse.length());
                    return rawTextResponse;
                }
            }
            log.warn("OCR Gemini: không parse được candidates/parts từ response cho tệp [{}]. Response đầu: {}",
                    fileLabel, rawResponse.substring(0, Math.min(300, rawResponse.length())));
        } catch (Exception e) {
            log.error("OCR qua Gemini cho tệp [{}] thất bại - Nguyên nhân: {} | Chi tiết: {}",
                    fileLabel, e.getClass().getSimpleName(), e.getMessage());
        }
        return "";
    }

    private String extractOcrTextFromJson(String text) {
        if (text == null || text.isBlank())
            return "";
        String clean = text.trim();
        if (clean.startsWith("```json"))
            clean = clean.substring(7);
        else if (clean.startsWith("```"))
            clean = clean.substring(3);
        if (clean.endsWith("```"))
            clean = clean.substring(0, clean.length() - 3);
        clean = clean.trim();

        try {
            JsonNode node = objectMapper.readTree(clean);
            if (node.has("extractedText") && !node.get("extractedText").asText().isBlank()) {
                return node.get("extractedText").asText();
            }
            if (node.has("extracted_text") && !node.get("extracted_text").asText().isBlank()) {
                return node.get("extracted_text").asText();
            }
            if (node.has("text") && !node.get("text").asText().isBlank()) {
                return node.get("text").asText();
            }
            if (node.has("content") && !node.get("content").asText().isBlank()) {
                return node.get("content").asText();
            }
            if (node.has("result") && !node.get("result").asText().isBlank()) {
                return node.get("result").asText();
            }
        } catch (Exception ignored) {
        }

        return clean;
    }

    public String resolveMimeType(String filename) {
        if (filename == null)
            return "application/pdf";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png"))
            return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
            return "image/jpeg";
        return "application/pdf";
    }
}
