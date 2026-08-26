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
                Bạn là Chuyên gia Thẩm định Học liệu Giáo dục cao cấp của hệ thống HanoiPrep.
                Nhiệm vụ của bạn là kiểm tra tính ĐỒNG NHẤT, ĐÚNG VAI TRÒ và TƯƠNG THÍCH HOÀN TOÀN giữa 3 tệp tin học liệu tải lên:
                1. Tệp Đề bài (`questionFile`)
                2. Tệp Đáp án (`solutionFile`)
                3. Tệp Tài liệu học tập / Lý thuyết (`materialFile` - nếu có)

                LƯU Ý QUAN TRỌNG:
                - KHÔNG cần so khớp với tiêu đề bài học.
                - Tập trung 100% vào việc phân tích bản chất nội dung và mối tương quan giữa các tệp tin với nhau.

                ================ CÁC QUY TẮC THẨM ĐỊNH BẮT BUỘC ================

                QUY TẮC 1: ĐÚNG VAI TRÒ TỪNG TỆP TIN (ROLE INTEGRITY)
                - [Tệp 1 - questionFile (ĐỀ BÀI)]:
                  + BẮT BUỘC: Phải là tập hợp các câu hỏi, bài toán, đề thi mà học sinh cần giải.
                  + KHÔNG ĐƯỢC: Chứa sẵn toàn bộ bài giải chi tiết, kết quả số học hoàn chỉnh hay barem điểm; KHÔNG ĐƯỢC là tài liệu lý thuyết giáo trình thuần túy không có bài tập.
                
                - [Tệp 2 - solutionFile (ĐÁP ÁN)]:
                  + BẮT BUỘC: Phải là hướng dẫn giải, các bước giải chi tiết, đáp án hoặc barem chấm điểm cho CHÍNH XÁC các câu hỏi trong Tệp 1.
                  + KHÔNG ĐƯỢC: Chỉ là danh sách câu hỏi trần trụi không có bài giải; KHÔNG ĐƯỢC là tài liệu lý thuyết chung chung.

                - [Tệp 3 - materialFile (TÀI LIỆU HỌC TẬP / LÝ THUYẾT - nếu có)]:
                  + BẮT BUỘC: Phải là lý thuyết, định lý, công thức, bài giảng hoặc kiến thức bổ trợ cùng chuyên đề với Đề bài.
                  + KHÔNG ĐƯỢC: Nộp nhầm đề bài hay đáp án vào đây; KHÔNG ĐƯỢC lệch môn học (ví dụ: Đề bài là Toán nhưng Tài liệu là môn Văn/Sử/Sinh).

                QUY TẮC 2: PHÁT HIỆN TẤT CẢ CÁC TRƯỜNG HỢP NỘP NHẦM / TRÁO ĐỔI VỊ TRÍ (SWAPPED FILES)
                - Nếu Đề bài <-> Đáp án bị tráo đổi (Đề bài chứa lời giải, Đáp án chứa đề bài) -> `valid: false`, reason: "Phát hiện nộp ngược file: Bạn đã tải tệp Lời giải vào ô Đề bài và tệp Đề bài vào ô Đáp án. Vui lòng tráo đổi lại vị trí 2 tệp này."
                - Nếu Tài liệu lý thuyết <-> Đề bài bị tráo đổi (Ô Đề bài là lý thuyết giáo trình, ô Tài liệu là đề bài) -> `valid: false`, reason: "Phát hiện nộp nhầm file: Ô Đề bài đang chứa tài liệu lý thuyết bài giảng. Vui lòng kiểm tra lại vị trí các file."
                - Nếu Tài liệu lý thuyết <-> Đáp án bị tráo đổi (Ô Đáp án là tài liệu lý thuyết không có lời giải) -> `valid: false`, reason: "Phát hiện nộp nhầm file: Tệp tải vào ô Đáp án không chứa lời giải cho đề bài mà là tài liệu lý thuyết."
                - Nếu 2 hoặc 3 tệp tin bị nộp trùng lặp nội dung giống hệt nhau -> `valid: false`, reason: "Phát hiện tệp tin bị tải trùng lặp nội dung giữa các ô."

                QUY TẮC 3: ĐỒNG NHẤT MÔN HỌC & CHUYÊN ĐỀ (SUBJECT & TOPIC CONSISTENCY)
                - Cả 3 tệp tin (Đề bài, Đáp án, Tài liệu) BẮT BUỘC phải cùng một môn học (Toán, Lý, Hóa, Văn, Tiếng Anh...), cùng cấp độ và cùng một chủ đề kiến thức.
                - KHÔNG chấp nhận: Đề bài là môn Toán nhưng Đáp án là môn Hóa học; hoặc Đề bài gồm 3 bài toán hình học nhưng Đáp án lại giải 5 câu đại số hoàn toàn khác.

                QUY TẮC 4: LOẠI BỎ TÀI LIỆU RÁC (SPAM / JUNK CONTENT)
                - Mọi tệp tin phải là tài liệu giáo dục thực sự. Tuyệt đối không chấp nhận ảnh sinh hoạt cá nhân, phong cảnh, biên lai, hóa đơn hoặc văn bản vô nghĩa.

                ================ DỮ LIỆU ĐẦU VÀO CẦN PHÂN TÍCH ================
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
                  "reason": "Giải thích ngắn gọn, súc tích và chính xác bằng tiếng Việt. Nếu valid=false, chỉ rõ đích danh tệp nào bị sai vai trò, bị nộp nhầm hoặc lệch môn học. Nếu valid=true, ghi 'Tài liệu học tập, Đề bài và Đáp án hoàn toàn đồng nhất, đúng vai trò.'",
                  "mismatchedFiles": ["Tên các file không khớp, ví dụ: 'solutionFile', 'questionFile', 'materialFile' hoặc để mảng rỗng [] nếu hợp lệ"]
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
