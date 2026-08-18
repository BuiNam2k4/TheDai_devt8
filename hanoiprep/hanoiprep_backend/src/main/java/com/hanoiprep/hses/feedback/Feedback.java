package com.hanoiprep.hses.feedback;

import com.hanoiprep.hses.lesson.Lesson;
import com.hanoiprep.hses.submission.Submission;
import com.hanoiprep.hses.user.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedbacks")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "submission_id", nullable = true)
    private Submission submission;

    @Column(columnDefinition = "NVARCHAR(MAX)", nullable = false)
    private String comment;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
