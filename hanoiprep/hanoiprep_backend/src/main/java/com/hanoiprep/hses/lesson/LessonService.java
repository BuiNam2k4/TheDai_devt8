package com.hanoiprep.hses.lesson;

import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

public interface LessonService {
    List<Lesson> getAllLessons();
    Lesson getLessonById(Long id);
    Map<String, Object> createLesson(
            String title,
            String category,
            String contentText,
            String contentLatex,
            String solutionSteps,
            Long providerId,
            MultipartFile materialFile,
            MultipartFile questionFile,
            MultipartFile solutionFile
    );
    org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> downloadLessonFile(Long id, String type);
}
