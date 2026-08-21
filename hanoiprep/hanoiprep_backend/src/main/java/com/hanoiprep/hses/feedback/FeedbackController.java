package com.hanoiprep.hses.feedback;

import com.hanoiprep.hses.common.dto.ApiResponse;
import com.hanoiprep.hses.feedback.payload.FeedbackRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/feedbacks")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping
    public ResponseEntity<ApiResponse<Feedback>> createOrUpdateFeedback(@RequestBody FeedbackRequest request) {
        Feedback saved = feedbackService.createOrUpdateFeedback(request);
        return ResponseEntity.ok(ApiResponse.success("Gửi phản hồi thành công", saved));
    }

    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<ApiResponse<List<Feedback>>> getFeedbacksByLesson(@PathVariable Long lessonId) {
        return ResponseEntity.ok(ApiResponse.success(feedbackService.getFeedbacksByLesson(lessonId)));
    }

    @GetMapping("/provider/{providerId}")
    public ResponseEntity<ApiResponse<List<Feedback>>> getFeedbacksByProvider(@PathVariable Long providerId) {
        return ResponseEntity.ok(ApiResponse.success(feedbackService.getFeedbacksByProvider(providerId)));
    }

    @GetMapping("/submission/{submissionId}")
    public ResponseEntity<ApiResponse<Feedback>> getFeedbackBySubmission(@PathVariable Long submissionId) {
        Feedback feedback = feedbackService.getFeedbackBySubmission(submissionId);
        return ResponseEntity.ok(ApiResponse.success(feedback));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Feedback>>> getAllFeedbacks() {
        return ResponseEntity.ok(ApiResponse.success(feedbackService.getAllFeedbacks()));
    }
}
