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

    // Các model hoạt động tốt nhất hiện tại trên Google GenerativeLanguage API v1beta
    private static final List<String> MODEL_PRIORITY = List.of(
            "gemini-3.5-flash",
            "gemini-flash-latest",
            "gemini-3.6-flash",
            "gemini-3.1-flash-lite"
    );

    public GeminiService() {
        this.restTemplate = new RestTemplate();
        // CẤU HÌNH QUAN TRỌNG: Ép RestTemplate dùng UTF-8 để không bị lỗi chính tả/font tiếng Việt
        this.restTemplate.getMessageConverters()
                .add(0, new StringHttpMessageConverter(StandardCharsets.UTF_8));
        this.objectMapper = new ObjectMapper();
    }

    public String callGemini(String promptText) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("application", "json", StandardCharsets.UTF_8));

        // Build proper JSON request body using ObjectMapper
        ObjectNode rootNode = objectMapper.createObjectNode();
        ArrayNode contents = rootNode.putArray("contents");
        ObjectNode contentObj = contents.addObject();
        ArrayNode parts = contentObj.putArray("parts");
        parts.addObject().put("text", promptText);

        ObjectNode genConfig = rootNode.putObject("generationConfig");
        genConfig.put("temperature", 0.2);
        genConfig.put("maxOutputTokens", 8192);
        genConfig.put("response_mime_type", "application/json");

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
            String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey);
            try {
                log.info("Calling Gemini API with model: {}", model);
                ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    log.info("Gemini API call succeeded with model: {}", model);
                    return response.getBody();
                }
            } catch (Exception e) {
                log.warn("Gemini model [{}] failed: {}", model, e.getMessage());
                lastException = e;
            }
        }

        throw new RuntimeException("All Gemini models failed. Last error: " + (lastException != null ? lastException.getMessage() : "Unknown error"));
    }
}
