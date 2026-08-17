package com.hanoiprep.hses.submission;

import com.hanoiprep.hses.common.CloudinaryService;
import com.hanoiprep.hses.grading.AIGradingService;
import com.hanoiprep.hses.lesson.Lesson;
import com.hanoiprep.hses.lesson.LessonRepository;
import com.hanoiprep.hses.user.User;
import com.hanoiprep.hses.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/submissions")
public class SubmissionController {

    @Autowired
    private SubmissionRepository submissionRepository;

    @Autowired
    private SubmissionDetailRepository submissionDetailRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private CloudinaryService cloudinaryService;

    @Autowired
    private com.hanoiprep.hses.grading.AIGradingProducer aiGradingProducer;

    @Autowired
    private AIGradingService aiGradingService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createSubmission(
            @RequestParam("userId") Long userId,
            @RequestParam("lessonId") Long lessonId,
            @RequestParam(value = "answerText", required = false) String answerText,
            @RequestPart(value = "answerFile", required = false) MultipartFile answerFile
    ) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            Lesson lesson = lessonRepository.findById(lessonId).orElse(null);

            if (user == null || lesson == null) {
                return ResponseEntity.badRequest().body("User or Lesson not found!");
            }

            Submission submission = new Submission();
            submission.setUser(user);
            submission.setLesson(lesson);

            StringBuilder combinedAnswer = new StringBuilder();
            if (answerText != null && !answerText.isBlank()) {
                combinedAnswer.append(answerText.trim());
            }

            if (answerFile != null && !answerFile.isEmpty()) {
                // 1. Upload file to Cloudinary
                byte[] fileBytes = answerFile.getBytes();
                String fileUrl = cloudinaryService.uploadFile(answerFile);
                submission.setAnswerFileUrl(fileUrl);

                // 2. Trích xuất nội dung từ file PDF bài làm của học sinh nếu là PDF
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
                        System.err.println("Không thể đọc text từ PDF bài nộp: " + pdfEx.getMessage());
                    }
                }
            }

            submission.setAnswerText(combinedAnswer.toString());
            submission.setCreatedAt(LocalDateTime.now());
            submission.setStatus("PENDING_GRADING");

            Submission saved = submissionRepository.save(submission);
            
            // Đẩy submissionId vào hàng đợi RabbitMQ (Async Rate-Limiting Queue)
            aiGradingProducer.sendGradingTask(saved.getId());

            return ResponseEntity.ok(saved);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Failed to upload file: " + e.getMessage());
        }
    }

    @GetMapping("/lesson/{lessonId}")
    public ResponseEntity<?> getSubmissionsByLesson(@PathVariable Long lessonId) {
        return ResponseEntity.ok(submissionRepository.findByLessonId(lessonId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getSubmissionById(@PathVariable Long id) {
        return submissionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/details")
    public ResponseEntity<?> getSubmissionDetails(@PathVariable Long id) {
        return ResponseEntity.ok(submissionDetailRepository.findBySubmissionId(id));
    }

    @PostMapping("/{id}/grade")
    public ResponseEntity<?> gradeSubmission(@PathVariable Long id) {
        try {
            aiGradingService.gradeSubmission(id);
            return ResponseEntity.ok("Chấm điểm thành công bằng AI");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi khi chấm điểm: " + e.getMessage());
        }
    }
}
