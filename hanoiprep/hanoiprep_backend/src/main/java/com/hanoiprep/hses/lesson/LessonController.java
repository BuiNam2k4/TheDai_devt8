package com.hanoiprep.hses.lesson;

import com.hanoiprep.hses.common.CloudinaryService;
import com.hanoiprep.hses.rubric.RubricExtractionService;
import com.hanoiprep.hses.user.User;
import com.hanoiprep.hses.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/lessons")
public class LessonController {

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CloudinaryService cloudinaryService;

    @Autowired
    private RubricExtractionService rubricExtractionService;

    @GetMapping
    public ResponseEntity<List<Lesson>> getAllLessons() {
        return ResponseEntity.ok(lessonRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getLessonById(@PathVariable Long id) {
        return lessonRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createLesson(
            @RequestParam("title") String title,
            @RequestParam("category") String category,
            @RequestParam(value = "contentText", required = false) String contentText,
            @RequestParam(value = "contentLatex", required = false) String contentLatex,
            @RequestParam(value = "solutionSteps", required = false) String solutionSteps,
            @RequestParam("providerId") Long providerId,
            @RequestPart(value = "materialFile", required = false) MultipartFile materialFile,
            @RequestPart(value = "questionFile", required = false) MultipartFile questionFile,
            @RequestPart(value = "solutionFile", required = false) MultipartFile solutionFile
    ) {
        try {
            User provider = userRepository.findById(providerId).orElse(null);
            if (provider == null) {
                return ResponseEntity.badRequest().body("Provider not found");
            }

            // ── QUAN TRỌNG: Cache bytes solutionFile TRƯỚC KHI upload Cloudinary ──
            // CloudinaryService.uploadFile() gọi file.getBytes() → InputStream bị consumed
            // PDFBox cũng cần InputStream → phải dùng bản sao bytes
            byte[] solutionBytes = null;
            String solutionOriginalName = null;
            if (solutionFile != null && !solutionFile.isEmpty()) {
                solutionBytes = solutionFile.getBytes();
                solutionOriginalName = solutionFile.getOriginalFilename();
            }

            // ── 1. Upload files & lưu Lesson ──
            Lesson lesson = new Lesson();
            lesson.setTitle(title);
            lesson.setCategory(category);
            lesson.setContentText(contentText != null ? contentText : "");
            lesson.setContentLatex(contentLatex != null ? contentLatex : "");
            lesson.setSolutionSteps(solutionSteps != null ? solutionSteps : "");
            lesson.setProvider(provider);

            if (materialFile != null && !materialFile.isEmpty()) {
                lesson.setMaterialFileUrl(cloudinaryService.uploadFile(materialFile));
            }
            if (questionFile != null && !questionFile.isEmpty()) {
                lesson.setQuestionFileUrl(cloudinaryService.uploadFile(questionFile));
            }
            if (solutionFile != null && !solutionFile.isEmpty()) {
                lesson.setSolutionFileUrl(cloudinaryService.uploadFile(solutionFile));
            }

            Lesson savedLesson = lessonRepository.save(lesson);

            // ── 2. AI tự sinh Rubric từ bytes đã cache ──
            int rubricCount = 0;
            String rubricStatus = "no_solution_file";

            if (solutionBytes != null && solutionBytes.length > 0) {
                try {
                    // Tạo MultipartFile wrapper từ bytes đã cache (không dùng spring-test)
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
                    rubricStatus = "extraction_failed: " + e.getMessage();
                }
            }

            // ── 3. Trả về response ──
            Map<String, Object> response = new HashMap<>();
            response.put("lesson", savedLesson);
            response.put("rubricCount", rubricCount);
            response.put("rubricStatus", rubricStatus);

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Failed to upload files: " + e.getMessage());
        }
    }
}
