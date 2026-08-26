package com.hanoiprep.hses.submission;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateSubmissionGradeRequest {

    private List<DetailGradeUpdate> details;
    private Double totalScore;
    private String generalFeedback;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DetailGradeUpdate {
        private Long detailId;
        private Long rubricId;
        private Double awardedScore;
        private String feedback;
    }
}
