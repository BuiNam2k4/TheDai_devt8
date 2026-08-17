package com.hanoiprep.hses.rubric;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "solution_embeddings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SolutionEmbedding {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "rubric_id")
    private Rubric rubric;

    @Column(columnDefinition = "TEXT")
    private String stepDescription;
}
