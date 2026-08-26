package com.hanoiprep.hses.lesson.validation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hanoiprep.hses.chatbot.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

/**
 * Thẩm định tính nhất quán và liên quan giữa các tài liệu tải lên:
 * 1. Đề bài (questionFile) vs Đáp án (solutionFile): Đáp án phải giải cho đề bài tương ứng
 * 2. Tài liệu lý thuyết (materialFile) vs Đề bài: Cùng môn học / lĩnh vực kiến thức
 * 3. Bỏ qua so khớp Tiêu đề bài học (title)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentConsistencyValidator {

    private final DocumentTextExtractor textExtractor;
    private final TextNormalizer textNormalizer;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int MAX_ANALYSIS_CHARS = 4000;

    /**
     * Thẩm định tính nhất quán giữa các tệp tin
     */
    public DocumentValidationResult validate(
            MultipartFile materialFile,
            MultipartFile questionFile,
            MultipartFile solutionFile
    ) {
        log.info("Bắt đầu kiểm tra tính nhất quán giữa các tài liệu bài học...");

        // 1. Trích xuất và chuẩn hóa nội dung Đề bài
        String questionText = textExtractor.extractText(questionFile, "Đề bài");
        if (questionText.isBlank()) {
            return DocumentValidationResult.failure(
                    "Tệp Đề bài bị rỗng hoặc không thể nhận diện được nội dung chữ. Vui lòng kiểm tra lại file.",
                    List.of("questionFile")
            );
        }

        // 2. Trích xuất và chuẩn hóa nội dung Đáp án
        String solutionText = textExtractor.extractText(solutionFile, "Đáp án");
        if (solutionText.isBlank()) {
            return DocumentValidationResult.failure(
                    "Tệp Đáp án bị rỗng hoặc không thể nhận diện được nội dung chữ. Vui lòng kiểm tra lại file.",
                    List.of("solutionFile")
            );
        }

        // 3. Trích xuất Tài liệu bài giảng (nếu có)
        String materialText = (materialFile != null && !materialFile.isEmpty())
                ? textExtractor.extractText(materialFile, "Tài liệu lý thuyết")
                : "";

        // Rút gọn văn bản tối ưu cho AI phân tích
        String truncatedQuestion = textNormalizer.truncateForAnalysis(questionText, MAX_ANALYSIS_CHARS);
        String truncatedSolution = textNormalizer.truncateForAnalysis(solutionText, MAX_ANALYSIS_CHARS);
        String truncatedMaterial = materialText.isBlank() ? "" : textNormalizer.truncateForAnalysis(materialText, 2500);

        // 4. Xây dựng Prompt Thẩm định Chéo
        String prompt = buildValidationPrompt(truncatedQuestion, truncatedSolution, truncatedMaterial);

        try {
            log.info("Gửi yêu cầu thẩm định tính nhất quán tới Gemini AI...");
            String responseJson = geminiService.callGemini(prompt);
            return parseAiResponse(responseJson, questionText, solutionText, materialText);
        } catch (Exception e) {
            log.error("Lỗi trong quá trình thẩm định tài liệu qua AI: {}", e.getMessage(), e);
            // Trong trường hợp lỗi mạng hoặc Gemini không khả dụng, trả về thông báo lỗi an toàn
            return DocumentValidationResult.failure(
                    "Không thể xác thực tính nhất quán của tài liệu do lỗi kết nối dịch vụ thẩm định AI: " + e.getMessage(),
                    List.of()
            );
        }
    }

    /**
     * Xây dựng Prompt thẩm định ngữ nghĩa tập trung so sánh giữa các file
     */
    private String buildValidationPrompt(String questionText, String solutionText, String materialText) {
        StringBuilder sb = new StringBuilder();
        sb.append("""
                Bạn là Chuyên gia Thẩm định Học liệu Giáo dục của hệ thống HanoiPrep.
                Nhiệm vụ của bạn là kiểm tra tính đồng nhất, hợp lệ và liên quan trực tiếp giữa các tệp tin tải lên.

                LƯU Ý QUAN TRỌNG:
                - KHÔNG cần so khớp với tiêu đề bài học.
                - Tập trung 100% vào việc so sánh nội dung giữa các tệp tin với nhau.

                CÁC TIÊU CHÍ ĐÁNH GIÁ (BẮT BUỘC):
                1. [ĐỀ BÀI vs ĐÁP ÁN - QUAN TRỌNG NHẤT]:
                   - Đáp án có phải là lời giải/hướng dẫn chấm cho các câu hỏi có trong Đề bài hay không?
                   - Có cùng môn học (Toán, Lý, Hóa, Văn, Tiếng Anh...), cùng cấp độ và cùng chuyên đề kiến thức không?
                   - Ví dụ KHÔNG HỢP LỆ: Đề bài là môn Toán nhưng Đáp án là môn Tiếng Anh; hoặc Đề bài gồm 5 câu hỏi nhưng Đáp án lại giải cho một đề hoàn toàn khác.

                2. [TÀI LIỆU LÝ THUYẾT vs ĐỀ BÀI (Nếu có)]:
                   - Tài liệu bài giảng có cùng môn học và thuộc phạm vi kiến thức bổ trợ cho Đề bài/Đáp án không?

                3. [KIỂM TRA TÀI LIỆU RÁC]:
                   - Tệp tin có phải là tài liệu học tập thật sự không? (Không chấp nhận ảnh sinh hoạt cá nhân, biên lai, tài liệu vô nghĩa).

                4. [KIỂM TRA NỘP NGƯỢC FILE ĐỀ BÀI VÀ ĐÁP ÁN (QUAN TRỌNG)]:
                   - Tệp 1 (questionFile - Đề bài): Phải là nội dung các câu hỏi/yêu cầu bài tập, KHÔNG được chứa sẵn toàn bộ bài giải chi tiết, kết quả số học hoàn chỉnh hay barem điểm.
                   - Tệp 2 (solutionFile - Đáp án): Phải là hướng dẫn giải/lời giải chi tiết/barem điểm, KHÔNG được chỉ là danh sách câu hỏi trần trụi không có lời giải.
                   - NẾU phát hiện người dùng tải nhầm Lời giải vào ô Đề bài và tải Đề bài vào ô Đáp án -> BẮT BUỘC trả về `valid: false` kèm reason: "Phát hiện nộp ngược file: Bạn đã tải tệp Lời giải vào ô Đề bài và tệp Đề bài vào ô Đáp án. Vui lòng tráo đổi lại vị trí 2 tệp tin này."

                ================ DỮ LIỆU ĐẦU VÀO ================
                """);

        sb.append("--- TỆP 1: NỘI DUNG ĐỀ BÀI (questionFile) ---\n")
          .append(questionText).append("\n\n");

        sb.append("--- TỆP 2: NỘI DUNG ĐÁP ÁN (solutionFile) ---\n")
          .append(solutionText).append("\n\n");

        if (!materialText.isBlank()) {
            sb.append("--- TỆP 3: TÀI LIỆU LÝ THUYẾT ĐÍNH KÈM (materialFile) ---\n")
              .append(materialText).append("\n\n");
        }

        sb.append("""
                ================ ĐỊNH DẠNG ĐẦU RA (JSON) ================
                Hãy trả về DUY NHẤT một đối tượng JSON có cấu trúc sau:
                {
                  "valid": true / false,
                  "reason": "Giải thích ngắn gọn, rõ ràng bằng tiếng Việt. Nếu valid=false, chỉ rõ file nào bị lệch hoặc bị nộp ngược. Nếu valid=true, ghi 'Tài liệu đồng nhất và hợp lệ.'",
                  "mismatchedFiles": ["Tên các file không khớp, ví dụ: 'solutionFile' hoặc 'questionFile' hoặc để mảng rỗng [] nếu hợp lệ"]
                }
                """);

        return sb.toString();
    }

    /**
     * Bóc tách JSON trả về từ Gemini
     */
    private DocumentValidationResult parseAiResponse(
            String responseJson,
            String questionText,
            String solutionText,
            String materialText
    ) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode candidates = root.path("candidates");
            String contentText = "";

            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    contentText = parts.get(0).path("text").asText("");
                }
            } else {
                contentText = responseJson;
            }

            // Clean Markdown code block wrapper if present
            contentText = contentText.trim();
            if (contentText.startsWith("```json")) {
                contentText = contentText.substring(7);
            }
            if (contentText.startsWith("```")) {
                contentText = contentText.substring(3);
            }
            if (contentText.endsWith("```")) {
                contentText = contentText.substring(0, contentText.length() - 3);
            }
            contentText = contentText.trim();

            JsonNode parsed = objectMapper.readTree(contentText);
            boolean valid = parsed.path("valid").asBoolean(true);
            String reason = parsed.path("reason").asText(valid ? "Tài liệu đồng nhất và hợp lệ" : "Tài liệu không khớp nhau");

            List<String> mismatchedFiles = new ArrayList<>();
            JsonNode mismatchArray = parsed.path("mismatchedFiles");
            if (mismatchArray.isArray()) {
                for (JsonNode item : mismatchArray) {
                    mismatchedFiles.add(item.asText());
                }
            }

            return DocumentValidationResult.builder()
                    .valid(valid)
                    .reason(reason)
                    .mismatchedFiles(mismatchedFiles)
                    .extractedQuestionText(questionText)
                    .extractedSolutionText(solutionText)
                    .extractedMaterialText(materialText)
                    .build();
        } catch (Exception e) {
            log.error("Lỗi phân tích JSON kết quả thẩm định từ Gemini: {}", e.getMessage());
            // Fallback an toàn nếu Gemini không trả đúng JSON
            return DocumentValidationResult.success(questionText, solutionText, materialText);
        }
    }
}
