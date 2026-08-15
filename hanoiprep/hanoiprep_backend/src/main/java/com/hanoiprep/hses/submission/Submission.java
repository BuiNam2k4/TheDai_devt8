package com.hanoiprep.hses.submission;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;
import com.hanoiprep.hses.user.User;
import com.hanoiprep.hses.lesson.Lesson;

@Entity
@Table(name = "submissions")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Submission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    private String imageUrl; // legacy?
    private String answerFileUrl;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String answerText;
    private String status;
    private Double totalScore;
    
    private LocalDateTime createdAt;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "submission", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SubmissionDetail> submissionDetails;
}
