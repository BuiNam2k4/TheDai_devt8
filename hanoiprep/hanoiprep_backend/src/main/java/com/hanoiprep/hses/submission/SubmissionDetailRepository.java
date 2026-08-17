package com.hanoiprep.hses.submission;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface SubmissionDetailRepository extends JpaRepository<SubmissionDetail, Long> {
    List<SubmissionDetail> findBySubmissionId(Long submissionId);

    @Transactional
    void deleteBySubmissionId(Long submissionId);

    /** Xóa tất cả chi tiết điểm liên kết với một tiêu chí rubric cụ thể (dùng khi xóa rubric cũ) */
    @Transactional
    void deleteByRubricId(Long rubricId);
}
