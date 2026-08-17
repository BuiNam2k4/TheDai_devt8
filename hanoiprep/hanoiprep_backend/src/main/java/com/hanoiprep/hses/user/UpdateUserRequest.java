package com.hanoiprep.hses.user;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {
    @Size(min = 3, max = 20)
    private String username;

    private String gmail;

    private String password;

    private String role;

    private Boolean active;
}
