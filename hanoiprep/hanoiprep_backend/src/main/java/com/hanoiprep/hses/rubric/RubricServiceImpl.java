package com.hanoiprep.hses.rubric;

import com.hanoiprep.hses.common.exception.AppException;
import com.hanoiprep.hses.common.exception.ErrorCode;
import com.hanoiprep.hses.lesson.Lesson;
import com.hanoiprep.hses.lesson.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RubricServiceImpl implements RubricService {

    private final RubricRepository rubricRepository;
    private final LessonRepository lessonRepository;
    private final RubricExtractionService rubricExtractionService;

    @Override
    public List<Rubric> getRubricsByLesson(Long lessonId) {
        return rubricRepository.findByLessonIdOrderByQuestionNoAscStepOrderAsc(lessonId);
    }

    @Override
    @Transactional
    public Map<String, Object> reExtractRubrics(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        List<Rubric> rubrics = rubricExtractionService.extractAndSaveRubricsFromLessonEntity(lesson);
        return Map.of(
                "message", "Trích xuất Rubric thành công",
                "rubricCount", rubrics.size(),
                "rubrics", rubrics
        );
    }

    @Override
    @Transactional
    public Rubric createRubric(Long lessonId, Map<String, Object> body) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        Rubric rubric = new Rubric();
        rubric.setLesson(lesson);
        rubric.setStepOrder(body.containsKey("stepOrder") ? ((Number) body.get("stepOrder")).intValue() : 1);
        rubric.setStepDescription((String) body.get("stepDescription"));
        rubric.setMaxScore(body.containsKey("maxScore") ? ((Number) body.get("maxScore")).doubleValue() : 10.0);
        rubric.setExpectedLogicKeyword((String) body.getOrDefault("expectedLogicKeyword", ""));

        return rubricRepository.save(rubric);
    }

    @Override
    @Transactional
    public void deleteRubric(Long id) {
        if (!rubricRepository.existsById(id)) {
            throw new AppException(ErrorCode.RUBRIC_NOT_FOUND);
        }
        rubricRepository.deleteById(id);
    }
}
