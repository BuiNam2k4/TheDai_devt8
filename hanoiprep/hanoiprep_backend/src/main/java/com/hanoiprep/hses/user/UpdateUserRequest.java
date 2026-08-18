package com.hanoiprep.hses.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {

    @Size(min = 3, max = 20, message = "Username must be between 3 and 20 characters")
    private String username;

    @Email(message = "Invalid email format")
    private String gmail;

    @Pattern(regexp = "^(ROLE_ADMIN|ROLE_COURSE_PROVIDER|ROLE_LEARNER)?$", message = "Invalid role")
    private String role;

    private Boolean active;
}
