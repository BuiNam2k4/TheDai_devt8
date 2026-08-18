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

    private String title;
    private String category;
    
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String contentText;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String contentLatex;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String solutionSteps;

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

