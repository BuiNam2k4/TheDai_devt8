package com.hanoiprep.hses.lesson;

import com.hanoiprep.hses.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/lessons")
@RequiredArgsConstructor
public class LessonController {

    private final LessonService lessonService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Lesson>>> getAllLessons() {
        return ResponseEntity.ok(ApiResponse.success(lessonService.getAllLessons()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Lesson>> getLessonById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(lessonService.getLessonById(id)));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> createLesson(
            @RequestParam("title") String title,
            @RequestParam("category") String category,
            @RequestParam(value = "contentText", required = false) String contentText,
            @RequestParam(value = "contentLatex", required = false) String contentLatex,
            @RequestParam(value = "solutionSteps", required = false) String solutionSteps,
            @RequestParam("providerId") Long providerId,
            @RequestPart(value = "materialFile", required = false) MultipartFile materialFile,
            @RequestPart(value = "questionFile", required = false) MultipartFile questionFile,
            @RequestPart(value = "solutionFile", required = false) MultipartFile solutionFile
    ) {
        Map<String, Object> result = lessonService.createLesson(
                title, category, contentText, contentLatex, solutionSteps, providerId,
                materialFile, questionFile, solutionFile
        );
        return ResponseEntity.ok(ApiResponse.success("Tạo bài học thành công", result));
    }

    @GetMapping("/{id}/download/{type}")
    public ResponseEntity<org.springframework.core.io.Resource> downloadLessonFile(
            @PathVariable Long id,
            @PathVariable String type
    ) {
        return lessonService.downloadLessonFile(id, type);
    }
}
