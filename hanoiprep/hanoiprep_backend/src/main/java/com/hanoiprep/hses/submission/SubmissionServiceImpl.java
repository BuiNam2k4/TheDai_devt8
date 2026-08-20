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
                            if (combinedAnswer.length() > 0) combinedAnswer.append("\n\n--- NỘI DUNG TỪ FILE PDF BÀI LÀM ---\n");
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
            log.error("Lỗi khi chấm điểm thủ công: ", e);
            throw new AppException(ErrorCode.AI_GRADING_FAILED, "Lỗi khi chấm điểm: " + e.getMessage());
        }
    }
}
