package com.hanoiprep.hses.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatbotSubmissionRequest {

    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    private String message;
}
