package com.hanoiprep.hses.submission;

import com.hanoiprep.hses.common.CloudinaryService;
import com.hanoiprep.hses.common.exception.AppException;
import com.hanoiprep.hses.common.exception.ErrorCode;
import com.hanoiprep.hses.grading.AIGradingProducer;
import com.hanoiprep.hses.grading.AIGradingService;
import com.hanoiprep.hses.lesson.Lesson;
import com.hanoiprep.hses.lesson.LessonRepository;
import com.hanoiprep.hses.user.User;
import com.hanoiprep.hses.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionServiceImpl implements SubmissionService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionDetailRepository submissionDetailRepository;
    private final UserRepository userRepository;
    private final LessonRepository lessonRepository;
    private final CloudinaryService cloudinaryService;
    private final AIGradingProducer aiGradingProducer;
    private final AIGradingService aiGradingService;

    @Override
    @Transactional
    public Submission createSubmission(Long userId, Long lessonId, String answerText, MultipartFile answerFile) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));

        if (answerFile != null && !answerFile.isEmpty()) {
            String filename = answerFile.getOriginalFilename();
            if (filename != null) {
                String lower = filename.toLowerCase();
                if (!lower.endsWith(".pdf") && !lower.endsWith(".png") && !lower.endsWith(".jpg")
                        && !lower.endsWith(".jpeg")) {
                    throw new AppException(ErrorCode.INVALID_INPUT,
                            "File bài nộp không hợp lệ ('" + filename
                                    + "'). Hệ thống chỉ chấp nhận file PDF (.pdf) hoặc Hình ảnh (.png, .jpg, .jpeg).");
                }
            }
        }

        Submission submission = new Submission();
        submission.setUser(user);
        submission.setLesson(lesson);

        StringBuilder combinedAnswer = new StringBuilder();
        if (answerText != null && !answerText.isBlank()) {
            combinedAnswer.append(answerText.trim());
        }

        if (answerFile != null && !answerFile.isEmpty()) {
            try {
                byte[] fileBytes = answerFile.getBytes();
                String fileUrl = cloudinaryService.uploadFile(answerFile);
                submission.setAnswerFileUrl(fileUrl);

                String filename = answerFile.getOriginalFilename();
                if (filename != null && filename.toLowerCase().endsWith(".pdf")) {
                    try (org.apache.pdfbox.pdmodel.PDDocument doc = org.apache.pdfbox.Loader.loadPDF(fileBytes)) {
                        org.apache.pdfbox.text.PDFTextStripper stripper = new org.apache.pdfbox.text.PDFTextStripper();
                        String pdfText = stripper.getText(doc).trim();
                        if (!pdfText.isBlank()) {
                            if (combinedAnswer.length() > 0)
                                combinedAnswer.append("\n\n--- NỘI DUNG TỪ FILE PDF BÀI LÀM ---\n");
                            combinedAnswer.append(pdfText);
                        }
                    } catch (Exception pdfEx) {
                        log.warn("Không thể đọc text từ PDF bài nộp: {}", pdfEx.getMessage());
                    }
                }
            } catch (IOException e) {
                throw new AppException(ErrorCode.FILE_UPLOAD_FAILED, "Lỗi khi upload bài làm: " + e.getMessage());
            }
        }

        submission.setAnswerText(combinedAnswer.toString());
        submission.setCreatedAt(LocalDateTime.now());
        submission.setStatus("PENDING_GRADING");

        Submission saved = submissionRepository.save(submission);

        // Đẩy submissionId vào hàng đợi RabbitMQ
        aiGradingProducer.sendGradingTask(saved.getId());

        return saved;
    }

    @Override
    public List<Submission> getSubmissionsByLesson(Long lessonId) {
        return submissionRepository.findByLessonId(lessonId);
    }

    @Override
    public List<Submission> getSubmissionsByUser(Long userId) {
        return submissionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public Submission getSubmissionById(Long id) {
        return submissionRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.SUBMISSION_NOT_FOUND));
    }

    @Override
    public List<SubmissionDetail> getSubmissionDetails(Long submissionId) {
        return submissionDetailRepository.findBySubmissionId(submissionId);
    }

    @Override
    public void gradeSubmissionManually(Long submissionId) {
        try {
            aiGradingService.gradeSubmission(submissionId);
        } catch (Exception e) {
            log.error("Lỗi khi chấm điểm thủ công cho submission {}: {}", submissionId, e.getMessage(), e);
            aiGradingService.markGradingFailed(submissionId, e.getMessage());
            throw new AppException(ErrorCode.AI_GRADING_FAILED, "Lỗi khi chấm điểm: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public Submission updateSubmissionGrades(Long submissionId, UpdateSubmissionGradeRequest request) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new AppException(ErrorCode.SUBMISSION_NOT_FOUND));

        if (request.getDetails() != null && !request.getDetails().isEmpty()) {
            double calculatedTotal = 0.0;
            for (UpdateSubmissionGradeRequest.DetailGradeUpdate item : request.getDetails()) {
                if (item.getDetailId() != null) {
                    SubmissionDetail detail = submissionDetailRepository.findById(item.getDetailId())
                            .orElse(null);
                    if (detail != null && detail.getSubmission().getId().equals(submissionId)) {
                        if (item.getAwardedScore() != null) {
                            double maxScore = detail.getRubric() != null ? detail.getRubric().getMaxScore() : 10.0;
                            if (item.getAwardedScore() < 0 || item.getAwardedScore() > maxScore) {
                                String qInfo = detail.getRubric() != null ? (detail.getRubric().getQuestionNo() + " - Bước " + detail.getRubric().getStepOrder()) : "tiêu chí";
                                throw new AppException(ErrorCode.INVALID_INPUT,
                                        "Điểm nhập (" + item.getAwardedScore() + ") cho " + qInfo
                                                + " không hợp lệ. Điểm phải nằm trong khoảng từ 0 đến " + maxScore + " điểm.");
                            }
                            double safeScore = Math.round(item.getAwardedScore() * 100.0) / 100.0;
                            detail.setAwardedScore(safeScore);
                            calculatedTotal += safeScore;
                        }
                        if (item.getFeedback() != null) {
                            detail.setAiFeedback(item.getFeedback());
                        }
                        submissionDetailRepository.save(detail);
                    }
                }
            }

            if (request.getTotalScore() != null) {
                submission.setTotalScore(Math.round(request.getTotalScore() * 100.0) / 100.0);
            } else {
                submission.setTotalScore(Math.round(calculatedTotal * 100.0) / 100.0);
            }
        } else if (request.getTotalScore() != null) {
            submission.setTotalScore(Math.round(request.getTotalScore() * 100.0) / 100.0);
        }

        submission.setStatus("GRADED");
        submission.setGradedAt(LocalDateTime.now());
        log.info("Giáo viên đã cập nhật điểm bài nộp {}: tổng điểm {}", submissionId, submission.getTotalScore());
        return submissionRepository.save(submission);
    }
}
