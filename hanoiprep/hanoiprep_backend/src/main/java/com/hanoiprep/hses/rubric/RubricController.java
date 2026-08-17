package com.hanoiprep.hses.rubric;

import com.hanoiprep.hses.lesson.Lesson;
import com.hanoiprep.hses.lesson.LessonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
public class RubricController {

    @Autowired
    private RubricRepository rubricRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private RubricExtractionService rubricExtractionService;

    /** Lấy danh sách rubric của 1 lesson theo thứ tự câu và bước */
    @GetMapping("/api/lessons/{lessonId}/rubrics")
    public ResponseEntity<?> getRubricsByLesson(@PathVariable Long lessonId) {
        return ResponseEntity.ok(rubricRepository.findByLessonIdOrderByQuestionNoAscStepOrderAsc(lessonId));
    }

    /** Tự động trích xuất lại Rubrics từ file đáp án của lesson bằng AI */
    @PostMapping("/api/lessons/{lessonId}/re-extract-rubrics")
    public ResponseEntity<?> reExtractRubrics(@PathVariable Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Lesson not found"));
        }
        var rubrics = rubricExtractionService.extractAndSaveRubricsFromLessonEntity(lesson);
        return ResponseEntity.ok(Map.of(
                "message", "Rubrics extracted successfully",
                "rubricCount", rubrics.size(),
                "rubrics", rubrics
        ));
    }

    /** Tạo 1 rubric step cho lesson */
    @PostMapping("/api/lessons/{lessonId}/rubrics")
    public ResponseEntity<?> createRubric(
            @PathVariable Long lessonId,
            @RequestBody Map<String, Object> body) {

        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null) {
            return ResponseEntity.badRequest().body("Lesson not found");
        }

        Rubric rubric = new Rubric();
        rubric.setLesson(lesson);
        rubric.setStepOrder(body.containsKey("stepOrder") ? ((Number) body.get("stepOrder")).intValue() : 1);
        rubric.setStepDescription((String) body.get("stepDescription"));
        rubric.setMaxScore(body.containsKey("maxScore") ? ((Number) body.get("maxScore")).doubleValue() : 10.0);
        rubric.setExpectedLogicKeyword((String) body.getOrDefault("expectedLogicKeyword", ""));

        Rubric saved = rubricRepository.save(rubric);
        return ResponseEntity.ok(saved);
    }

    /** Xóa 1 rubric */
    @DeleteMapping("/api/rubrics/{id}")
    public ResponseEntity<?> deleteRubric(@PathVariable Long id) {
        if (!rubricRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        rubricRepository.deleteById(id);
        return ResponseEntity.ok("Rubric deleted");
    }
}
