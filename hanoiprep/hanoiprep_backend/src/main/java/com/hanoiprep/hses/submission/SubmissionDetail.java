package com.hanoiprep.hses.submission;

import jakarta.persistence.*;
import lombok.*;
import com.hanoiprep.hses.rubric.Rubric;

@Entity
@Table(name = "submission_details")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionDetail {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "submission_id")
    private Submission submission;

    @ManyToOne
    @JoinColumn(name = "rubric_id", nullable = true)
    private Rubric rubric;

    private Double awardedScore;
    

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String aiFeedback;
}
