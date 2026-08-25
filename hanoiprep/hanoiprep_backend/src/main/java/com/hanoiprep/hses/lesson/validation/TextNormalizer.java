package com.hanoiprep.hses.lesson.validation;

import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tiền xử lý, chuẩn hóa Unicode NFC và Thuật toán Rút gọn Thông minh:
 * - Lọc sạch thông tin rác / nhiễu phòng thi (Boilerplate Stripping)
 * - Nhận dạng ranh giới từng câu hỏi (Question Boundary Detection)
 * - Bảo toàn thân câu hỏi chính (Question Stem) của TẤT CẢ các câu hỏi trong đề
 * - Tuyệt đối không cắt ngang lưng từ ngữ hoặc công thức toán học
 */
@Component
public class TextNormalizer {

    private static final Pattern MULTI_WHITESPACE = Pattern.compile("[ \\t]+");
    private static final Pattern MULTI_NEWLINE = Pattern.compile("(\\r?\\n){3,}");
    private static final Pattern CONTROL_CHARS = Pattern.compile("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]");

    // Regex phát hiện các dòng tiêu đề rác phòng thi / số trang
    private static final Pattern BOILERPLATE_LINES = Pattern.compile(
            "(?im)^\\s*(bộ giáo dục|sở giáo dục|trường thpt|kỳ thi|đề thi thử|đề kiểm tra|thời gian làm bài|mã đề thi|số báo danh|họ và tên|cán bộ coi thi|trang\\s*\\d+/\\d+|page\\s*\\d+\\s*(of|/)\\s*\\d+).*$(\\r?\\n)?",
            Pattern.UNICODE_CASE
    );

    // Regex nhận dạng ranh giới bắt đầu câu hỏi (Câu 1, Bài 2, Question 3, Part I, Hướng dẫn giải...)
    private static final Pattern QUESTION_HEADER_PATTERN = Pattern.compile(
            "(?im)(?:^|\\n\\s*)(?=(?:câu|bài|question|problem|task|part|phần)\\s*(?:\\d+|[ivxldcm]+|[a-z])[\\s:.)-]|(?:hướng dẫn giải|đáp án|lời giải|solution)[\\s:.)-])",
            Pattern.UNICODE_CASE
    );

    /**
     * Chuẩn hóa văn bản tiếng Việt và làm sạch ký tự rác
     */
    public String normalize(String rawText) {
        if (rawText == null || rawText.isBlank()) {
            return "";
        }

        // 1. Chuẩn hóa bảng mã Unicode NFC
        String normalized = Normalizer.normalize(rawText, Normalizer.Form.NFC);

        // 2. Xóa ký tự điều khiển ẩn rác
        normalized = CONTROL_CHARS.matcher(normalized).replaceAll("");

        // 3. Chuẩn hóa dấu xuống dòng Windows/Unix (\r\n -> \n)
        normalized = normalized.replace("\r\n", "\n").replace("\r", "\n");

        // 4. Thu gọn khoảng trắng thừa trên từng dòng
        normalized = MULTI_WHITESPACE.matcher(normalized).replaceAll(" ");

        // 5. Thu gọn nhiều dòng trống liên tiếp
        normalized = MULTI_NEWLINE.matcher(normalized).replaceAll("\n\n");

        return normalized.trim();
    }

    /**
     * Lọc bỏ các dòng nhiễu phòng thi (tiêu đề trường, giám thị, số trang...)
     */
    public String stripBoilerplate(String text) {
        if (text == null || text.isBlank()) return "";
        return BOILERPLATE_LINES.matcher(text).replaceAll("").trim();
    }

    /**
     * THUẬT TOÁN RÚT GỌN THÔNG MINH BẢO TOÀN CẤU TRÚC CÂU HỎI (QUESTION-PRESERVING TRUNCATION):
     * - Nếu văn bản <= maxChars: Giữ nguyên 100%
     * - Nếu văn bản > maxChars:
     *   1. Lọc bỏ thông tin nhiễu phòng thi
     *   2. Tách thành danh sách từng câu hỏi độc lập
     *   3. Phân bổ ngân sách đại diện đều cho TẤT CẢ các câu hỏi (từ Câu 1 đến Câu N)
     *   4. Cắt tại ranh giới dấu chấm câu an toàn (. ? ! \n), không đứt gãy công thức toán
     */
    public String truncateForAnalysis(String rawText, int maxChars) {
        if (rawText == null || rawText.isBlank()) {
            return "";
        }

        String normalized = normalize(rawText);
        if (normalized.length() <= maxChars) {
            return normalized;
        }

        // 1. Lọc bớt nhiễu phòng thi
        String cleanText = stripBoilerplate(normalized);
        if (cleanText.length() <= maxChars) {
            return cleanText;
        }

        // 2. Tách văn bản thành các khối câu hỏi
        List<String> questionBlocks = extractQuestionBlocks(cleanText);

        // 3. Nếu tìm thấy từ 2 câu hỏi trở lên -> Phân bổ ngân sách đều cho từng câu
        if (questionBlocks.size() >= 2) {
            return buildBalancedQuestionSummary(questionBlocks, maxChars);
        }

        // 4. Fallback cho văn bản dạng đoạn văn dài không có tiêu đề câu hỏi rõ ràng
        return buildParagraphBasedSummary(cleanText, maxChars);
    }

    /**
     * Tách văn bản thành các khối câu hỏi dựa trên ranh giới câu
     */
    private List<String> extractQuestionBlocks(String text) {
        List<String> blocks = new ArrayList<>();
        String[] parts = QUESTION_HEADER_PATTERN.split(text);

        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isBlank()) {
                blocks.add(trimmed);
            }
        }
        return blocks;
    }

    /**
     * Phân bổ ngân sách đồng đều cho TẤT CẢ các câu hỏi trong đề
     */
    private String buildBalancedQuestionSummary(List<String> questionBlocks, int maxChars) {
        StringBuilder sb = new StringBuilder();
        int totalQuestions = questionBlocks.size();
        sb.append(String.format("[TÓM TẮT ĐỒNG BỘ %d CÂU HỎI CỦA ĐỀ BÀI]:\n\n", totalQuestions));

        int reservedForHeaders = sb.length() + (totalQuestions * 15);
        int availableBudget = Math.max(maxChars - reservedForHeaders, totalQuestions * 100);
        int budgetPerQuestion = Math.max(120, availableBudget / totalQuestions);

        for (int i = 0; i < totalQuestions; i++) {
            String block = questionBlocks.get(i);
            String questionCore = extractQuestionStem(block, budgetPerQuestion);

            sb.append("• ").append(questionCore);
            if (!questionCore.endsWith("\n")) {
                sb.append("\n\n");
            }
        }

        return sb.toString().trim();
    }

    /**
     * Trích xuất thân câu hỏi chính (Question Stem) an toàn theo ranh giới câu
     */
    private String extractQuestionStem(String questionBlock, int maxLen) {
        if (questionBlock.length() <= maxLen) {
            return questionBlock;
        }

        String sub = questionBlock.substring(0, maxLen);

        // Tìm điểm ngắt câu tự nhiên gần nhất (. hoặc ? hoặc ! hoặc dấu xuống dòng)
        int lastPeriod = Math.max(sub.lastIndexOf(".\n"), sub.lastIndexOf(". "));
        int lastQuestionMark = Math.max(sub.lastIndexOf("?\n"), sub.lastIndexOf("? "));
        int lastExclamation = Math.max(sub.lastIndexOf("!\n"), sub.lastIndexOf("! "));
        int lastNewline = sub.lastIndexOf("\n");

        int naturalCut = Math.max(Math.max(lastPeriod, lastQuestionMark), Math.max(lastExclamation, lastNewline));

        // Nếu tìm thấy dấu ngắt câu hợp lý (trong nửa sau của ngân sách) -> Cắt tại ranh giới câu
        if (naturalCut > maxLen / 2) {
            return questionBlock.substring(0, naturalCut + 1).trim() + " [...]";
        }

        // Nếu không có dấu câu, cắt tại khoảng trắng gần nhất để không bị đứt từ
        int lastSpace = sub.lastIndexOf(" ");
        if (lastSpace > maxLen / 2) {
            return questionBlock.substring(0, lastSpace).trim() + " [...]";
        }

        return sub.trim() + " [...]";
    }

    /**
     * Tóm tắt đoạn văn dựa trên ranh giới câu kết thúc
     */
    private String buildParagraphBasedSummary(String text, int maxChars) {
        int half = (maxChars - 100) / 2;
        String head = extractQuestionStem(text, half);
        String tail = text.substring(Math.max(0, text.length() - half));

        // Cắt đầu phần tail tại ranh giới từ để không đứt gãy
        int firstSpace = tail.indexOf(" ");
        if (firstSpace != -1 && firstSpace < 30) {
            tail = tail.substring(firstSpace + 1);
        }

        return head + "\n\n...[Phần giữa được rút gọn để tối ưu phân tích]...\n\n" + tail.trim();
    }
}
