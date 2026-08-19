package com.hanoiprep.hses.submission;

import com.hanoiprep.hses.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Submission>> createSubmission(
            @RequestParam("userId") Long userId,
            @RequestParam("lessonId") Long lessonId,
            @RequestParam(value = "answerText", required = false) String answerText,
            @RequestPart(value = "answerFile", required = false) MultipartFile answerFile
    ) {
        Submission submission = submissionService.createSubmission(userId, lessonId, answerText, answerFile);
        return ResponseEntity.ok(ApiResponse.success("Nộp bài thành công, hệ thống đang chấm điểm", submission));
    }

    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<ApiResponse<List<Submission>>> getSubmissionsByLesson(@PathVariable Long lessonId) {
        return ResponseEntity.ok(ApiResponse.success(submissionService.getSubmissionsByLesson(lessonId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Submission>> getSubmissionById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(submissionService.getSubmissionById(id)));
    }

    @GetMapping("/{id}/details")
    public ResponseEntity<ApiResponse<List<SubmissionDetail>>> getSubmissionDetails(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(submissionService.getSubmissionDetails(id)));
    }

    @PostMapping("/{id}/grade")
    public ResponseEntity<ApiResponse<Void>> gradeSubmission(@PathVariable Long id) {
        submissionService.gradeSubmissionManually(id);
        return ResponseEntity.ok(ApiResponse.success("Chấm điểm thành công bằng AI", null));
    }
}
