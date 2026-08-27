package com.hanoiprep.hses.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    private String apiKey;

    // Các model hoạt động tốt nhất hiện tại trên Google GenerativeLanguage API v1beta (đã kiểm tra và hoạt động 100%)
    private static final List<String> MODEL_PRIORITY = List.of(
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemini-flash-latest",
            "gemini-flash-lite-latest");

    /** Số lần retry tối đa cho mỗi model khi gặp lỗi tạm thời */
    private static final int MAX_RETRIES = 2;

    public GeminiService() {
        // Cấu hình timeout: 10s kết nối, 90s đọc (Gemini đôi khi cần ~60s cho prompt
        // dài)
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10_000);
        factory.setReadTimeout(90_000);
        this.restTemplate = new RestTemplate(factory);
        // CẤU HÌNH QUAN TRỌNG: Ép RestTemplate dùng UTF-8 để không bị lỗi chính tả/font
        // tiếng Việt
        this.restTemplate.getMessageConverters()
                .add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));
        this.objectMapper = new ObjectMapper();
    }

    public String callGemini(String promptText) {
        return callGeminiInternal(promptText, null, null, true);
    }

    public String callGeminiWithMedia(String promptText, byte[] mediaBytes, String mimeType) {
        // Khi gọi OCR với ảnh/PDF: KHÔNG dùng response_mime_type JSON mode
        // vì sẽ khiến model trả về [] rỗng thay vì text thực sự từ bảng/hình ảnh
        return callGeminiInternal(promptText, mediaBytes, mimeType, false);
    }

    private String callGeminiInternal(String promptText, byte[] mediaBytes, String mimeType, boolean forceJsonMode) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("application", "json", StandardCharsets.UTF_8));

        // Build proper JSON request body using ObjectMapper
        ObjectNode rootNode = objectMapper.createObjectNode();
        ArrayNode contents = rootNode.putArray("contents");
        ObjectNode contentObj = contents.addObject();
        ArrayNode parts = contentObj.putArray("parts");

        // Nếu có media (PDF/Ảnh) -> encode Base64 và đưa vào inlineData
        if (mediaBytes != null && mediaBytes.length > 0) {
            ObjectNode inlineData = parts.addObject().putObject("inlineData");
            inlineData.put("mimeType", (mimeType != null && !mimeType.isBlank()) ? mimeType : "image/png");
            inlineData.put("data", java.util.Base64.getEncoder().encodeToString(mediaBytes));
        }

        parts.addObject().put("text", promptText);

        ObjectNode genConfig = rootNode.putObject("generationConfig");
        genConfig.put("temperature", 0.2);
        genConfig.put("maxOutputTokens", 8192);
        // Chỉ bật JSON mode cho text-only prompts (không áp dụng khi OCR ảnh/bảng)
        if (forceJsonMode) {
            genConfig.put("response_mime_type", "application/json");
        }

        String requestBody;
        try {
            requestBody = objectMapper.writeValueAsString(rootNode);
        } catch (Exception e) {
            throw new RuntimeException("Failed to construct JSON payload for Gemini: " + e.getMessage());
        }

        HttpEntity<String> request = new HttpEntity<>(requestBody, headers);

        // Thử lần lượt các model trong MODEL_PRIORITY cho đến khi thành công
        Exception lastException = null;
        for (String model : MODEL_PRIORITY) {
            String url = String.format(
                    "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                    model, apiKey);

            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    log.info("Calling Gemini API with model: {} (attempt {}/{})", model, attempt, MAX_RETRIES);
                    ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
                    if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                        log.info("Gemini API call succeeded with model: {} on attempt {}", model, attempt);
                        return response.getBody();
                    }
                } catch (org.springframework.web.client.HttpStatusCodeException e) {
                    int statusCode = e.getStatusCode().value();
                    String responseBody = e.getResponseBodyAsString();

                    // 401 Unauthorized = API key không hợp lệ → fail ngay
                    if (statusCode == 401) {
                        log.error("Gemini API key không hợp lệ hoặc chưa được cấp quyền (401 Unauthorized). "
                                + "Vui lòng kiểm tra lại GEMINI_API_KEY trong file .env");
                        throw new RuntimeException(
                                "Gemini API key không hợp lệ (401 Unauthorized). "
                                        + "Vui lòng cập nhật GEMINI_API_KEY hợp lệ trong file .env",
                                e);
                    }

                    // 503 (High Demand / Overloaded) hoặc 429 (Quota exceeded / Rate Limit)
                    if (statusCode == 503 || statusCode == 429 || responseBody.contains("high demand") || responseBody.contains("quota")) {
                        log.warn("Gemini model [{}] đang bị quá tải hoặc quá giới hạn (HTTP {} - High Demand). Chuyển ngay sang model tiếp theo trong danh sách ưu tiên...",
                                model, statusCode);
                        lastException = e;
                        break; // Bỏ qua model này, sang model tiếp theo ngay lập tức
                    }

                    // 404 Not Found = Model không tồn tại hoặc đã bị khai tử
                    if (statusCode == 404) {
                        log.warn("Gemini model [{}] không khả dụng (HTTP 404). Chuyển sang model tiếp theo.", model);
                        lastException = e;
                        break;
                    }

                    log.warn("Gemini model [{}] attempt {}/{} thất bại (HTTP {}): {}",
                            model, attempt, MAX_RETRIES, statusCode, e.getMessage());
                    lastException = e;
                } catch (Exception e) {
                    log.warn("Gemini model [{}] attempt {}/{} thất bại: {}",
                            model, attempt, MAX_RETRIES, e.getMessage());
                    lastException = e;
                }

                // Exponential backoff giữa các lần retry: 1s
                if (attempt < MAX_RETRIES) {
                    try {
                        long backoffMs = 1000L;
                        log.info("Waiting {}ms before retry...", backoffMs);
                        Thread.sleep(backoffMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }

            log.warn("Gemini model [{}] không thành công, chuyển sang model tiếp theo.", model);
        }

        throw new RuntimeException("Tất cả Gemini models đều thất bại. Lỗi cuối: "
                + (lastException != null ? lastException.getMessage() : "Unknown error"));
    }
}
