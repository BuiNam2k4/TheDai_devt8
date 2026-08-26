package com.hanoiprep.hses.chatbot.dto;

import com.hanoiprep.hses.chatbot.ChatMessage;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {

    private Long id;
    private String sender;
    private String content;
    private Boolean isFeedbackSuggestion;
    private String suggestedFeedbackDraft;
    private LocalDateTime createdAt;

    public static ChatMessageDto fromEntity(ChatMessage entity) {
        if (entity == null) return null;
        return ChatMessageDto.builder()
                .id(entity.getId())
                .sender(entity.getSender())
                .content(entity.getContent())
                .isFeedbackSuggestion(entity.getIsFeedbackSuggestion())
                .suggestedFeedbackDraft(entity.getSuggestedFeedbackDraft())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
