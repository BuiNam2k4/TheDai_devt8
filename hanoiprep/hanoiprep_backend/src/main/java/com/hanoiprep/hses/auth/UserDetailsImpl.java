package com.hanoiprep.hses.auth;

import com.hanoiprep.hses.user.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;

public class UserDetailsImpl implements UserDetails {

    private Long id;
    private String username;
    private String gmail;
    private String password;
    private boolean isActive;
    private Collection<? extends GrantedAuthority> authorities;

    public UserDetailsImpl(Long id, String username, String gmail, String password, boolean isActive,
            Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.username = username;
        this.gmail = gmail;
        this.password = password;
        this.isActive = isActive;
        this.authorities = authorities;
    }

    public static UserDetailsImpl build(User user) {
        List<GrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority(user.getRole()));
        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getGmail(),
                user.getPassword(),
                user.isActive(),
                authorities);
    }

    public Long getId() {
        return id;
    }

    public String getGmail() {
        return gmail;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true; // Có thể cập nhật logic sau
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isActive;
    }
}
