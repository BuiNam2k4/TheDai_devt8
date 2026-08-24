package com.hanoiprep.hses.submission;

import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface SubmissionService {
    Submission createSubmission(Long userId, Long lessonId, String answerText, MultipartFile answerFile);
    List<Submission> getSubmissionsByLesson(Long lessonId);
    List<Submission> getSubmissionsByUser(Long userId);
    Submission getSubmissionById(Long id);
    List<SubmissionDetail> getSubmissionDetails(Long submissionId);
    void gradeSubmissionManually(Long submissionId);
}
