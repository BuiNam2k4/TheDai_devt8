package com.hanoiprep.hses.user;

import com.hanoiprep.hses.auth.payload.request.SignupRequest;
import com.hanoiprep.hses.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<User>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.success(userService.getAllUsers()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getUserById(id)));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> createUser(@Valid @RequestBody SignupRequest createUserRequest) {
        User createdUser = userService.createUser(createUserRequest);
        return ResponseEntity.ok(ApiResponse.success("Tạo người dùng thành công", createdUser));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> updateUser(@PathVariable Long id, @Valid @RequestBody UpdateUserRequest updateRequest) {
        User updatedUser = userService.updateUser(id, updateRequest);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật người dùng thành công", updatedUser));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deactivateUser(@PathVariable Long id) {
        userService.deactivateUser(id);
        return ResponseEntity.ok(ApiResponse.success("Đã vô hiệu hóa người dùng", null));
    }

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> activateUser(@PathVariable Long id) {
        userService.activateUser(id);
        return ResponseEntity.ok(ApiResponse.success("Đã kích hoạt tài khoản người dùng", null));
    }
}
