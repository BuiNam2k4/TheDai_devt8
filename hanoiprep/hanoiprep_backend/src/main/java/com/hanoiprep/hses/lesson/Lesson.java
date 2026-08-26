package com.hanoiprep.hses.lesson;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import com.hanoiprep.hses.submission.Submission;
import com.hanoiprep.hses.rubric.Rubric;

@Entity
@Table(name = "lessons")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lesson {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "NVARCHAR(500)")
    private String title;

    @Column(columnDefinition = "NVARCHAR(255)")
    private String category;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String contentText;

    private String materialFileUrl;
    private String questionFileUrl;
    private String solutionFileUrl;

    @ManyToOne
    @JoinColumn(name = "provider_id")
    private com.hanoiprep.hses.user.User provider;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Submission> submissions;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Rubric> rubrics;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "lesson", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<com.hanoiprep.hses.feedback.Feedback> feedbacks;
}
