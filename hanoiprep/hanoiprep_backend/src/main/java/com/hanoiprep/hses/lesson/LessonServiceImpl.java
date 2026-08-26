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
    private final com.hanoiprep.hses.lesson.validation.DocumentConsistencyValidator documentConsistencyValidator;

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
            Long providerId,
            MultipartFile materialFile,
            MultipartFile questionFile,
            MultipartFile solutionFile) {
        User provider = userRepository.findById(providerId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND, "Provider không tồn tại"));

        // Validate file extensions: chỉ cho phép PDF hoặc Ảnh (PNG, JPG, JPEG)
        validateAllowedFile(materialFile, "Tài liệu");
        validateAllowedFile(questionFile, "Đề bài");
        validateAllowedFile(solutionFile, "Đáp án");

        // 0. Thẩm định tính nhất quán và tương ứng giữa các tệp tin (Đề bài vs Đáp án
        // vs Tài liệu)
        com.hanoiprep.hses.lesson.validation.DocumentValidationResult validationResult = documentConsistencyValidator
                .validate(materialFile, questionFile, solutionFile);

        if (!validationResult.isValid()) {
            log.warn("Từ chối lưu bài học do tài liệu không nhất quán: {}", validationResult.getReason());
            throw new AppException(ErrorCode.INVALID_INPUT, validationResult.getReason());
        }

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

        // 2. AI tự sinh Rubric (Tái sử dụng trực tiếp text đáp án đã OCR và chuẩn hóa
        // từ bước kiểm tra nhất quán)
        int rubricCount = 0;
        String rubricStatus = "no_solution_file";

        String preExtractedSolutionText = validationResult.getExtractedSolutionText();
        if (preExtractedSolutionText != null && !preExtractedSolutionText.isBlank()) {
            try {
                var rubrics = rubricExtractionService.extractAndSaveRubricsFromText(savedLesson,
                        preExtractedSolutionText);
                rubricCount = rubrics.size();
                rubricStatus = "auto_generated";
            } catch (Exception e) {
                log.warn("Tự động trích xuất Rubric từ text chuẩn hóa thất bại: {}", e.getMessage());
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

    private void validateAllowedFile(MultipartFile file, String fieldName) {
        if (file == null || file.isEmpty())
            return;
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Tệp tin " + fieldName + " không hợp lệ.");
        }
        String lower = filename.toLowerCase();
        if (!lower.endsWith(".pdf") && !lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".jpeg")) {
            throw new AppException(ErrorCode.INVALID_INPUT,
                    "Tệp tin " + fieldName + " không hợp lệ ('" + filename
                            + "'). Hệ thống chỉ cho phép nộp file định dạng PDF (.pdf) hoặc Hình ảnh (.png, .jpg, .jpeg).");
        }
    }

    private String detectMimeType(String filename) {
        if (filename == null)
            return "application/pdf";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png"))
            return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg"))
            return "image/jpeg";
        return "application/pdf";
    }

    @Override
    public org.springframework.http.ResponseEntity<org.springframework.core.io.Resource> downloadLessonFile(
            Long lessonId, String type) {
        Lesson lesson = getLessonById(lessonId);
        String fileUrl;
        String typeSuffix;
        if ("solution".equalsIgnoreCase(type)) {
            fileUrl = lesson.getSolutionFileUrl();
            typeSuffix = "Dap_An";
        } else if ("material".equalsIgnoreCase(type)) {
            fileUrl = lesson.getMaterialFileUrl();
            typeSuffix = "Tai_Lieu";
        } else {
            fileUrl = lesson.getQuestionFileUrl();
            typeSuffix = "De_Bai";
        }

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
                    ? lesson.getTitle().replaceAll("[^a-zA-Z0-9\\u00C0-\\u1EF9\\s_-]", "").trim().replaceAll("\\s+",
                            "_")
                    : "bai_hoc";

            String ext = ".pdf";
            org.springframework.http.MediaType mediaType = org.springframework.http.MediaType.APPLICATION_PDF;
            String lowerUrl = fileUrl.toLowerCase();
            if (lowerUrl.endsWith(".png")) {
                ext = ".png";
                mediaType = org.springframework.http.MediaType.IMAGE_PNG;
            } else if (lowerUrl.endsWith(".jpg") || lowerUrl.endsWith(".jpeg")) {
                ext = ".jpg";
                mediaType = org.springframework.http.MediaType.IMAGE_JPEG;
            }

            String filename = sanitizedTitle + "_" + typeSuffix + ext;

            org.springframework.core.io.ByteArrayResource resource = new org.springframework.core.io.ByteArrayResource(
                    fileBytes);

            return org.springframework.http.ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .contentType(mediaType)
                    .contentLength(fileBytes.length)
                    .body(resource);
        } catch (Exception e) {
            log.error("Lỗi khi tải file bài học: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.FILE_UPLOAD_FAILED, "Lỗi đọc tệp tin bài học: " + e.getMessage());
        }
    }
}