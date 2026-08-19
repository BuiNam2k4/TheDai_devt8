package com.hanoiprep.hses.rubric;

import com.hanoiprep.hses.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequiredArgsConstructor
public class RubricController {

    private final RubricService rubricService;

    /** Lấy danh sách rubric của 1 lesson theo thứ tự câu và bước */
    @GetMapping("/api/lessons/{lessonId}/rubrics")
    public ResponseEntity<ApiResponse<List<Rubric>>> getRubricsByLesson(@PathVariable Long lessonId) {
        return ResponseEntity.ok(ApiResponse.success(rubricService.getRubricsByLesson(lessonId)));
    }

    /** Tự động trích xuất lại Rubrics từ file đáp án của lesson bằng AI */
    @PostMapping("/api/lessons/{lessonId}/re-extract-rubrics")
    public ResponseEntity<ApiResponse<Map<String, Object>>> reExtractRubrics(@PathVariable Long lessonId) {
        return ResponseEntity.ok(ApiResponse.success("Trích xuất Rubric thành công", rubricService.reExtractRubrics(lessonId)));
    }

    /** Tạo 1 rubric step cho lesson */
    @PostMapping("/api/lessons/{lessonId}/rubrics")
    public ResponseEntity<ApiResponse<Rubric>> createRubric(
            @PathVariable Long lessonId,
            @RequestBody Map<String, Object> body) {
        Rubric saved = rubricService.createRubric(lessonId, body);
        return ResponseEntity.ok(ApiResponse.success("Tạo Rubric thành công", saved));
    }

    /** Xóa 1 rubric */
    @DeleteMapping("/api/rubrics/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRubric(@PathVariable Long id) {
        rubricService.deleteRubric(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa Rubric", null));
    }
}
