package com.hanoiprep.hses.feedback;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByLessonIdOrderByCreatedAtDesc(Long lessonId);

    List<Feedback> findByLessonProviderIdOrderByCreatedAtDesc(Long providerId);

    Optional<Feedback> findBySubmissionId(Long submissionId);

    List<Feedback> findByUserIdOrderByCreatedAtDesc(Long userId);
}
