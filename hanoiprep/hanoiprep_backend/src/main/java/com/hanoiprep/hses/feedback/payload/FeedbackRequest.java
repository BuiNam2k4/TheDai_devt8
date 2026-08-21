package com.hanoiprep.hses.feedback.payload;

import lombok.Data;

@Data
public class FeedbackRequest {
    private Long lessonId;
    private Long userId;
    private Long submissionId;
    private String comment;
}
