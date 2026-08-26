package com.hanoiprep.hses.chatbot;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnore
    private ChatSession session;

    /**
     * "USER" hoặc "AI"
     */
    @Column(nullable = false, length = 20)
    private String sender;

    /**
     * Nội dung câu hỏi hoặc câu trả lời của AI
     */
    @Column(columnDefinition = "NVARCHAR(MAX)", nullable = false)
    private String content;

    /**
     * Đánh dấu tin nhắn này có chứa gợi ý bản nháp phúc khảo hay không
     */
    @Builder.Default
    @Column(nullable = false)
    private Boolean isFeedbackSuggestion = false;

    /**
     * Nội dung bản nháp phúc khảo/góp ý được AI tự động soạn sẵn cho giáo viên
     */
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String suggestedFeedbackDraft;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
