package com.hanoiprep.hses.lesson;

import com.hanoiprep.hses.common.CloudinaryService;
import com.hanoiprep.hses.common.exception.AppException;
import com.hanoiprep.hses.common.exception.ErrorCode;
import com.hanoiprep.hses.rubric.RubricExtractionService;
import com.hanoiprep.hses.user.User;
import com.hanoiprep.hses.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class LessonServiceImpl implements LessonService {

    private final LessonRepository lessonRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final RubricExtractionService rubricExtractionService;

    @Override
    public List<Lesson> getAllLessons() {
        return lessonRepository.findAll();
    }

    @Override
    public Lesson getLessonById(Long id) {
        return lessonRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.LESSON_NOT_FOUND));
    }

    @Override
    @Transactional
    public Map<String, Object> createLesson(
            String title,
            String category,
            String contentText,
            String contentLatex,
            String solutionSteps,
            Long providerId,
            MultipartFile materialFile,
            MultipartFile questionFile,
            MultipartFile solutionFile
    ) {
        User provider = userRepository.findById(providerId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND, "Provider không tồn tại"));

        byte[] solutionBytes = null;
        String solutionOriginalName = null;
        if (solutionFile != null && !solutionFile.isEmpty()) {
            try {
                solutionBytes = solutionFile.getBytes();
                solutionOriginalName = solutionFile.getOriginalFilename();
            } catch (IOException e) {
                throw new AppException(ErrorCode.FILE_UPLOAD_FAILED, "Lỗi đọc file đáp án: " + e.getMessage());
            }
        }

        // 1. Upload files & lưu Lesson
        Lesson lesson = new Lesson();
        lesson.setTitle(title);
        lesson.setCategory(category);
        lesson.setContentText(contentText != null ? contentText : "");
        lesson.setContentLatex(contentLatex != null ? contentLatex : "");
        lesson.setSolutionSteps(solutionSteps != null ? solutionSteps : "");
        lesson.setProvider(provider);

        try {
            if (materialFile != null && !materialFile.isEmpty()) {
                lesson.setMaterialFileUrl(cloudinaryService.uploadFile(materialFile));
            }
            if (questionFile != null && !questionFile.isEmpty()) {
                lesson.setQuestionFileUrl(cloudinaryService.uploadFile(questionFile));
            }
            if (solutionFile != null && !solutionFile.isEmpty()) {
                lesson.setSolutionFileUrl(cloudinaryService.uploadFile(solutionFile));
            }
        } catch (IOException e) {
            throw new AppException(ErrorCode.FILE_UPLOAD_FAILED, "Lỗi tải tệp tin lên Cloudinary: " + e.getMessage());
        }

        Lesson savedLesson = lessonRepository.save(lesson);

        // 2. AI tự sinh Rubric từ bytes đã cache
        int rubricCount = 0;
        String rubricStatus = "no_solution_file";

        if (solutionBytes != null && solutionBytes.length > 0) {
            try {
                final byte[] finalBytes = solutionBytes;
                final String finalName = solutionOriginalName;
                MultipartFile solutionCopy = new MultipartFile() {
                    @Override public String getName() { return "solutionFile"; }
                    @Override public String getOriginalFilename() { return finalName; }
                    @Override public String getContentType() { return "application/pdf"; }
                    @Override public boolean isEmpty() { return finalBytes.length == 0; }
                    @Override public long getSize() { return finalBytes.length; }
                    @Override public byte[] getBytes() { return finalBytes; }
                    @Override public InputStream getInputStream() { return new ByteArrayInputStream(finalBytes); }
                    @Override public ByteArrayResource getResource() { return new ByteArrayResource(finalBytes); }
                    @Override public void transferTo(File dest) throws IOException {
                        throw new UnsupportedOperationException("transferTo not supported");
                    }
                };

                var rubrics = rubricExtractionService.extractAndSaveRubrics(savedLesson, solutionCopy);
                rubricCount = rubrics.size();
                rubricStatus = "auto_generated";
            } catch (Exception e) {
                log.warn("Tự động trích xuất Rubric thất bại: {}", e.getMessage());
                rubricStatus = "extraction_failed: " + e.getMessage();
            }
        }

        // 3. Trả về response map
        Map<String, Object> response = new HashMap<>();
        response.put("lesson", savedLesson);
        response.put("rubricCount", rubricCount);
        response.put("rubricStatus", rubricStatus);

        return response;
    }

    @Override
    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> downloadLessonFile(Long lessonId, String type) {
        Lesson lesson = getLessonById(lessonId);
        String fileUrl = "solution".equalsIgnoreCase(type) ? lesson.getSolutionFileUrl() : lesson.getQuestionFileUrl();

        if (fileUrl == null || fileUrl.trim().isEmpty()) {
            throw new AppException(ErrorCode.LESSON_NOT_FOUND, "Không tìm thấy file tài liệu cho bài học này");
        }

        try {
            byte[] fileBytes;
            if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
                java.net.URI uri = java.net.URI.create(fileUrl);
                try (java.io.InputStream in = uri.toURL().openStream()) {
                    fileBytes = in.readAllBytes();
                }
            } else {
                java.io.File file = new java.io.File(fileUrl);
                fileBytes = java.nio.file.Files.readAllBytes(file.toPath());
            }

            String sanitizedTitle = lesson.getTitle() != null 
                    ? lesson.getTitle().replaceAll("[^a-zA-Z0-9\\u00C0-\\u1EF9\\s_-]", "").trim().replaceAll("\\s+", "_")
                    : "bai_hoc";
            String suffix = "solution".equalsIgnoreCase(type) ? "Dap_An.pdf" : "De_Bai.pdf";
            String filename = sanitizedTitle + "_" + suffix;

            org.springframework.core.io.ByteArrayResource resource = new org.springframework.core.io.ByteArrayResource(fileBytes);

            return org.springframework.http.ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(org.springframework.http.MediaType.APPLICATION_PDF)
                    .contentLength(fileBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("Lỗi khi tải file bài học: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.FILE_UPLOAD_FAILED, "Lỗi đọc tệp tin bài học: " + e.getMessage());
        }
    }
}
