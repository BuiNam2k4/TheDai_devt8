package com.hanoiprep.hses.feedback;

import com.hanoiprep.hses.feedback.payload.FeedbackRequest;
import com.hanoiprep.hses.lesson.Lesson;
import com.hanoiprep.hses.lesson.LessonRepository;
import com.hanoiprep.hses.submission.Submission;
import com.hanoiprep.hses.submission.SubmissionRepository;
import com.hanoiprep.hses.user.User;
import com.hanoiprep.hses.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/feedbacks")
public class FeedbackController {

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubmissionRepository submissionRepository;

    @PostMapping
    public ResponseEntity<?> createOrUpdateFeedback(@RequestBody FeedbackRequest request) {
        if (request.getLessonId() == null || request.getUserId() == null) {
            return ResponseEntity.badRequest().body("lessonId and userId are required");
        }
        if (request.getComment() == null || request.getComment().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Comment cannot be empty");
        }

        Lesson lesson = lessonRepository.findById(request.getLessonId()).orElse(null);
        if (lesson == null) {
            return ResponseEntity.badRequest().body("Lesson not found with id: " + request.getLessonId());
        }

        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found with id: " + request.getUserId());
        }

        if ("ROLE_COURSE_PROVIDER".equalsIgnoreCase(user.getRole())) {
            return ResponseEntity.badRequest().body("Course providers do not have permission to submit feedbacks.");
        }

        Submission submission = null;
        if (request.getSubmissionId() != null) {
            submission = submissionRepository.findById(request.getSubmissionId()).orElse(null);
        }

        // Check if feedback already exists for this submission
        if (request.getSubmissionId() != null) {
            Optional<Feedback> existing = feedbackRepository.findBySubmissionId(request.getSubmissionId());
            if (existing.isPresent()) {
                Feedback feedback = existing.get();
                feedback.setComment(request.getComment().trim());
                feedback.setCreatedAt(LocalDateTime.now());
                Feedback updated = feedbackRepository.save(feedback);
                return ResponseEntity.ok(updated);
            }
        }

        Feedback feedback = Feedback.builder()
                .lesson(lesson)
                .user(user)
                .submission(submission)
                .comment(request.getComment().trim())
                .createdAt(LocalDateTime.now())
                .build();

        Feedback saved = feedbackRepository.save(feedback);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<List<Feedback>> getFeedbacksByLesson(@PathVariable Long lessonId) {
        return ResponseEntity.ok(feedbackRepository.findByLessonIdOrderByCreatedAtDesc(lessonId));
    }

    @GetMapping("/provider/{providerId}")
    public ResponseEntity<List<Feedback>> getFeedbacksByProvider(@PathVariable Long providerId) {
        return ResponseEntity.ok(feedbackRepository.findByLessonProviderIdOrderByCreatedAtDesc(providerId));
    }

    @GetMapping("/submission/{submissionId}")
    public ResponseEntity<?> getFeedbackBySubmission(@PathVariable Long submissionId) {
        return feedbackRepository.findBySubmissionId(submissionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping
    public ResponseEntity<List<Feedback>> getAllFeedbacks() {
        return ResponseEntity.ok(feedbackRepository.findAll());
    }
}
