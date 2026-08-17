package com.hanoiprep.hses.auth.payload.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SignupRequest {
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 20)
    private String username;

    @NotBlank(message = "Gmail is required")
    @Email(message = "Invalid email format")
    private String gmail;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 40)
    private String password;

    private String role;
}
