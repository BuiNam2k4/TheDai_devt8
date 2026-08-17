package com.hanoiprep.hses.auth.payload.response;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private Long id;
    private String username;
    private String gmail;
    private String role;

    public JwtResponse(String accessToken, Long id, String username, String gmail, String role) {
        this.token = accessToken;
        this.id = id;
        this.username = username;
        this.gmail = gmail;
        this.role = role;
    }

    public JwtResponse(String accessToken, Long id, String username, String role) {
        this(accessToken, id, username, null, role);
    }
}
