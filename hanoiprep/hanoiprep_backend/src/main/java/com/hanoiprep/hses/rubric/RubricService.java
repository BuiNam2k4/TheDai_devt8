package com.hanoiprep.hses.rubric;

import java.util.List;
import java.util.Map;

public interface RubricService {
    List<Rubric> getRubricsByLesson(Long lessonId);
    Map<String, Object> reExtractRubrics(Long lessonId);
    Rubric createRubric(Long lessonId, Map<String, Object> body);
    void deleteRubric(Long id);
}
