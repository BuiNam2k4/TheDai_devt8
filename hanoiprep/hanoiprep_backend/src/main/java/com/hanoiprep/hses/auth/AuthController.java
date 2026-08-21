package com.hanoiprep.hses.auth;

import com.hanoiprep.hses.auth.payload.request.LoginRequest;
import com.hanoiprep.hses.auth.payload.request.SignupRequest;
import com.hanoiprep.hses.auth.payload.response.JwtResponse;
import com.hanoiprep.hses.common.dto.ApiResponse;
import com.hanoiprep.hses.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtResponse>> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        JwtResponse jwtResponse = authService.login(loginRequest);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", jwtResponse));
    }

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<User>> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        User user = authService.signup(signUpRequest);
        return ResponseEntity.ok(ApiResponse.success("Đăng ký tài khoản thành công!", user));
    }
}
