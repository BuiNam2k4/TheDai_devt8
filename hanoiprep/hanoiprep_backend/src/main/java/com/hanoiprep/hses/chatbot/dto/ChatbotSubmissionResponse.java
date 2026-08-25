package com.hanoiprep.hses.chatbot.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatbotSubmissionResponse {

    private Long sessionId;
    private String reply;

    @Builder.Default
    private Boolean isFeedbackSuggestion = false;

    private String suggestedFeedbackDraft;

    @Builder.Default
    private List<ChatMessageDto> history = new ArrayList<>();
}
