package com.hanoiprep.hses.feedback;

import com.hanoiprep.hses.common.exception.AppException;
import com.hanoiprep.hses.common.exception.ErrorCode;
import com.hanoiprep.hses.feedback.payload.FeedbackRequest;
import com.hanoiprep.hses.lesson.Lesson;
import com.hanoiprep.hses.lesson.LessonRepository;
import com.hanoiprep.hses.submission.Submission;
import com.hanoiprep.hses.submission.SubmissionRepository;
import com.hanoiprep.hses.user.User;
import com.hanoiprep.hses.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FeedbackServiceImpl implements FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final SubmissionRepository submissionRepository;

    @Override
    @Transactional
    public Feedback createOrUpdateFeedback(FeedbackRequest request) {
        if (request.getLessonId() == null || request.getUserId() == null) {
            throw new AppException(ErrorCode.INVALID_INPUT, "lessonId và userId là bắt buộc");
        }
        if (request.getComment() == null || request.getComment().trim().isEmpty()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Nội dung phản hồi không được để trống");
        }

        Lesson lesson = lessonRepository.findById(request.getLessonId())
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        if ("ROLE_COURSE_PROVIDER".equalsIgnoreCase(user.getRole())) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Course provider không có quyền gửi phản hồi.");
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
                return feedbackRepository.save(feedback);
            }
        }

        Feedback feedback = Feedback.builder()
                .lesson(lesson)
                .user(user)
                .submission(submission)
                .comment(request.getComment().trim())
                .createdAt(LocalDateTime.now())
                .build();

        return feedbackRepository.save(feedback);
    }

    @Override
    public List<Feedback> getFeedbacksByLesson(Long lessonId) {
        return feedbackRepository.findByLessonIdOrderByCreatedAtDesc(lessonId);
    }

    @Override
    public List<Feedback> getFeedbacksByProvider(Long providerId) {
        return feedbackRepository.findByLessonProviderIdOrderByCreatedAtDesc(providerId);
    }

    @Override
    public Feedback getFeedbackBySubmission(Long submissionId) {
        return feedbackRepository.findBySubmissionId(submissionId).orElse(null);
    }

    @Override
    public List<Feedback> getAllFeedbacks() {
        return feedbackRepository.findAll();
    }
}
