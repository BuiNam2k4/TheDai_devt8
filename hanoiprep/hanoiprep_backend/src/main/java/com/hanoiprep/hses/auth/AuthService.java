package com.hanoiprep.hses.auth;

import com.hanoiprep.hses.auth.payload.request.LoginRequest;
import com.hanoiprep.hses.auth.payload.request.SignupRequest;
import com.hanoiprep.hses.auth.payload.response.JwtResponse;
import com.hanoiprep.hses.user.User;

public interface AuthService {
    JwtResponse login(LoginRequest loginRequest);
    User signup(SignupRequest signupRequest);
}
