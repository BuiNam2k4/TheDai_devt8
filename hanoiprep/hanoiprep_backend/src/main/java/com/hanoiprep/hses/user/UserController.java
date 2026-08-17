package com.hanoiprep.hses.user;

import com.hanoiprep.hses.auth.payload.request.SignupRequest;
import com.hanoiprep.hses.auth.payload.response.MessageResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(@Valid @RequestBody SignupRequest createUserRequest) {
        if (userRepository.existsByUsername(createUserRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        if (createUserRequest.getGmail() == null || createUserRequest.getGmail().trim().isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Gmail is required!"));
        }

        if (userRepository.existsByGmail(createUserRequest.getGmail().trim())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Gmail is already in use!"));
        }

        String reqRole = createUserRequest.getRole();
        String role = (reqRole != null && !reqRole.isEmpty()) ? reqRole : "ROLE_LEARNER";

        User user = User.builder()
                .username(createUserRequest.getUsername().trim())
                .gmail(createUserRequest.getGmail().trim())
                .password(encoder.encode(createUserRequest.getPassword()))
                .role(role)
                .active(true)
                .build();

        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User created successfully!"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest updateRequest) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOptional.get();

        // 1. Kiểm tra trùng username nếu đổi username
        if (updateRequest.getUsername() != null && !updateRequest.getUsername().isBlank()
                && !updateRequest.getUsername().equalsIgnoreCase(user.getUsername())) {
            if (userRepository.existsByUsername(updateRequest.getUsername().trim())) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Username is already taken!"));
            }
            user.setUsername(updateRequest.getUsername().trim());
        }

        // 2. Kiểm tra bắt buộc Gmail không được null / rỗng
        if (updateRequest.getGmail() == null || updateRequest.getGmail().trim().isBlank()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Gmail is required and cannot be empty!"));
        }
        if (!updateRequest.getGmail().trim().equalsIgnoreCase(user.getGmail())) {
            if (userRepository.existsByGmail(updateRequest.getGmail().trim())) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Gmail is already in use!"));
            }
            user.setGmail(updateRequest.getGmail().trim());
        }

        // 3. Đổi mật khẩu nếu có truyền password mới
        if (updateRequest.getPassword() != null && !updateRequest.getPassword().isBlank()) {
            if (updateRequest.getPassword().length() < 6) {
                return ResponseEntity.badRequest().body(new MessageResponse("Error: Password must be at least 6 characters long!"));
            }
            user.setPassword(encoder.encode(updateRequest.getPassword()));
        }

        // 4. Đổi role nếu có
        if (updateRequest.getRole() != null && !updateRequest.getRole().isBlank()) {
            user.setRole(updateRequest.getRole());
        }

        // 5. Đổi active nếu có
        if (updateRequest.getActive() != null) {
            user.setActive(updateRequest.getActive());
        }

        userRepository.save(user);
        return ResponseEntity.ok(new MessageResponse("User updated successfully!"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deactivateUser(@PathVariable Long id) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setActive(false);
            userRepository.save(user);
            return ResponseEntity.ok().body("User deactivated successfully!");
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activateUser(@PathVariable Long id) {
        Optional<User> userOptional = userRepository.findById(id);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setActive(true);
            userRepository.save(user);
            return ResponseEntity.ok().body("User activated successfully!");
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}

