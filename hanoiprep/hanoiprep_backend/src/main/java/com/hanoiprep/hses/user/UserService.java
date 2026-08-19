package com.hanoiprep.hses.user;

import com.hanoiprep.hses.auth.payload.request.SignupRequest;
import java.util.List;

public interface UserService {
    List<User> getAllUsers();
    User getUserById(Long id);
    User createUser(SignupRequest request);
    User updateUser(Long id, UpdateUserRequest request);
    void deactivateUser(Long id);
    void activateUser(Long id);
}
