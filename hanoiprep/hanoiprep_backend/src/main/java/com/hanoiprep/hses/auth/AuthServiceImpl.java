package com.hanoiprep.hses.auth;

import com.hanoiprep.hses.auth.payload.request.LoginRequest;
import com.hanoiprep.hses.auth.payload.request.SignupRequest;
import com.hanoiprep.hses.auth.payload.response.JwtResponse;
import com.hanoiprep.hses.common.exception.AppException;
import com.hanoiprep.hses.common.exception.ErrorCode;
import com.hanoiprep.hses.user.User;
import com.hanoiprep.hses.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder encoder;
    private final JwtUtils jwtUtils;

    @Override
    public JwtResponse login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        String role = userDetails.getAuthorities().stream()
                .findFirst()
                .map(item -> item.getAuthority())
                .orElse("ROLE_LEARNER");

        return new JwtResponse(
                jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getGmail(),
                role);
    }

    @Override
    @Transactional
    public User signup(SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername().trim())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        if (signUpRequest.getGmail() == null || signUpRequest.getGmail().trim().isBlank()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Gmail không được để trống!");
        }

        if (userRepository.existsByGmail(signUpRequest.getGmail().trim())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        String reqRole = signUpRequest.getRole();
        String role = (reqRole != null && !reqRole.isBlank()) ? reqRole : "ROLE_LEARNER";

        User user = User.builder()
                .username(signUpRequest.getUsername().trim())
                .gmail(signUpRequest.getGmail().trim())
                .password(encoder.encode(signUpRequest.getPassword()))
                .role(role)
                .active(true)
                .build();

        return userRepository.save(user);
    }
}
