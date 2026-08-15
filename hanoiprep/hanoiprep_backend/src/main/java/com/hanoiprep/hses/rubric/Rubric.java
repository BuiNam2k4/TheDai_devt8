package com.hanoiprep.hses.rubric;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import com.hanoiprep.hses.lesson.Lesson;
import com.hanoiprep.hses.submission.SubmissionDetail;

@Entity
@Table(name = "rubrics")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rubric {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "lesson_id")
    private Lesson lesson;

    @Column(columnDefinition = "NVARCHAR(255)")
    private String questionNo;

    private Integer stepOrder;
    
    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String stepDescription;
    
    private Double maxScore;
    private String expectedLogicKeyword;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "rubric")
    private List<SubmissionDetail> submissionDetails;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "rubric")
    private List<SolutionEmbedding> solutionEmbeddings;
}
