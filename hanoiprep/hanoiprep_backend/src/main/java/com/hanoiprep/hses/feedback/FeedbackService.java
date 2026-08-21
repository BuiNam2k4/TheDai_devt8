package com.hanoiprep.hses.feedback;

import com.hanoiprep.hses.feedback.payload.FeedbackRequest;
import java.util.List;

public interface FeedbackService {
    Feedback createOrUpdateFeedback(FeedbackRequest request);
    List<Feedback> getFeedbacksByLesson(Long lessonId);
    List<Feedback> getFeedbacksByProvider(Long providerId);
    Feedback getFeedbackBySubmission(Long submissionId);
    List<Feedback> getAllFeedbacks();
}
