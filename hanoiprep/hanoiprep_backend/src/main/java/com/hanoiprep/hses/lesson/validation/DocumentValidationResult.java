package com.hanoiprep.hses.lesson.validation;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class DocumentValidationResult {

    @Builder.Default
    private boolean valid = true;

    private String reason;

    @Builder.Default
    private List<String> mismatchedFiles = new ArrayList<>();

    // Lưu lại văn bản đã được OCR và chuẩn hóa để tái sử dụng ngay sau khi lưu DB
    private String extractedQuestionText;
    private String extractedSolutionText;
    private String extractedMaterialText;

    public static DocumentValidationResult success(String questionText, String solutionText, String materialText) {
        return DocumentValidationResult.builder()
                .valid(true)
                .reason("Tài liệu đồng nhất và hợp lệ")
                .extractedQuestionText(questionText)
                .extractedSolutionText(solutionText)
                .extractedMaterialText(materialText)
                .build();
    }

    public static DocumentValidationResult failure(String reason, List<String> mismatchedFiles) {
        return DocumentValidationResult.builder()
                .valid(false)
                .reason(reason)
                .mismatchedFiles(mismatchedFiles != null ? mismatchedFiles : new ArrayList<>())
                .build();
    }
}
