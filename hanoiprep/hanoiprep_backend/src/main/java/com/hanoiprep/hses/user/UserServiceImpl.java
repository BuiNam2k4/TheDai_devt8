package com.hanoiprep.hses.user;

import com.hanoiprep.hses.auth.payload.request.SignupRequest;
import com.hanoiprep.hses.common.exception.AppException;
import com.hanoiprep.hses.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder encoder;

    @Override
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Override
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
    }

    @Override
    @Transactional
    public User createUser(SignupRequest request) {
        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        if (request.getGmail() == null || request.getGmail().trim().isBlank()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Gmail không được để trống");
        }

        if (userRepository.existsByGmail(request.getGmail().trim())) {
            throw new AppException(ErrorCode.EMAIL_EXISTED);
        }

        String reqRole = request.getRole();
        String role = (reqRole != null && !reqRole.isBlank()) ? reqRole : "ROLE_LEARNER";

        User user = User.builder()
                .username(request.getUsername().trim())
                .gmail(request.getGmail().trim())
                .password(encoder.encode(request.getPassword()))
                .role(role)
                .active(true)
                .build();

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public User updateUser(Long id, UpdateUserRequest updateRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));

        // 1. Kiểm tra trùng username nếu đổi username
        if (updateRequest.getUsername() != null && !updateRequest.getUsername().isBlank()
                && !updateRequest.getUsername().equalsIgnoreCase(user.getUsername())) {
            if (userRepository.existsByUsername(updateRequest.getUsername().trim())) {
                throw new AppException(ErrorCode.USER_EXISTED);
            }
            user.setUsername(updateRequest.getUsername().trim());
        }

        // 2. Kiểm tra bắt buộc Gmail không được null / rỗng
        if (updateRequest.getGmail() == null || updateRequest.getGmail().trim().isBlank()) {
            throw new AppException(ErrorCode.INVALID_INPUT, "Gmail không được để trống");
        }
        if (!updateRequest.getGmail().trim().equalsIgnoreCase(user.getGmail())) {
            if (userRepository.existsByGmail(updateRequest.getGmail().trim())) {
                throw new AppException(ErrorCode.EMAIL_EXISTED);
            }
            user.setGmail(updateRequest.getGmail().trim());
        }

        // 3. Đổi role nếu có
        if (updateRequest.getRole() != null && !updateRequest.getRole().isBlank()) {
            user.setRole(updateRequest.getRole());
        }

        // 4. Đổi active nếu có
        if (updateRequest.getActive() != null) {
            user.setActive(updateRequest.getActive());
        }

        return userRepository.save(user);
    }

    @Override
    @Transactional
    public void deactivateUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setActive(false);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void activateUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
        user.setActive(true);
        userRepository.save(user);
    }
}
