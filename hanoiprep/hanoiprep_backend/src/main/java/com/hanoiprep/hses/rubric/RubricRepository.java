package com.hanoiprep.hses.rubric;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface RubricRepository extends JpaRepository<Rubric, Long> {
    List<Rubric> findByLessonId(Long lessonId);

    @Transactional
    void deleteByLessonId(Long lessonId);
}
