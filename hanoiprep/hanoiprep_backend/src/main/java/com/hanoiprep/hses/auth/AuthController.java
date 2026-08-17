package com.hanoiprep.hses.auth;

import com.hanoiprep.hses.auth.payload.request.LoginRequest;
import com.hanoiprep.hses.auth.payload.request.SignupRequest;
import com.hanoiprep.hses.auth.payload.response.JwtResponse;
import com.hanoiprep.hses.auth.payload.response.MessageResponse;
import com.hanoiprep.hses.user.User;
import com.hanoiprep.hses.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        // Extract role from GrantedAuthority
        String role = userDetails.getAuthorities().stream()
                .findFirst()
                .map(item -> item.getAuthority())
                .orElse("ROLE_LEARNER");

        return ResponseEntity.ok(new JwtResponse(
                jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getGmail(),
                role));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        if (signUpRequest.getGmail() == null || signUpRequest.getGmail().trim().isBlank()) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Gmail is required!"));
        }

        if (userRepository.existsByGmail(signUpRequest.getGmail().trim())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Gmail is already in use!"));
        }

        String reqRole = signUpRequest.getRole();
        String role = (reqRole != null && !reqRole.isEmpty()) ? reqRole : "ROLE_LEARNER";

        // Create new user's account
        User user = User.builder()
                .username(signUpRequest.getUsername().trim())
                .gmail(signUpRequest.getGmail().trim())
                .password(encoder.encode(signUpRequest.getPassword()))
                .role(role)
                .build();

        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }
}
