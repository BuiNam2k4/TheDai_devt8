package com.hanoiprep.hses.rubric;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface RubricRepository extends JpaRepository<Rubric, Long> {

    /** Lấy rubrics có thứ tự: theo câu/bài trước, rồi theo bước trong câu.
     *  Thứ tự này quan trọng cho rule cascade "bước trước sai → bước sau = 0". */
    List<Rubric> findByLessonIdOrderByQuestionNoAscStepOrderAsc(Long lessonId);

    /** Dùng khi không cần thứ tự cụ thể (ví dụ: kiểm tra tồn tại) */
    List<Rubric> findByLessonId(Long lessonId);

    @Transactional
    void deleteByLessonId(Long lessonId);
}

