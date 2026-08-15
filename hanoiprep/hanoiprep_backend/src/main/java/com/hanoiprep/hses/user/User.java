package com.hanoiprep.hses.user;

import jakarta.persistence.*;
import lombok.*;
import java.util.List;
import com.hanoiprep.hses.submission.Submission;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private String password;
    private String role;

    @Builder.Default
    private boolean active = true;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @OneToMany(mappedBy = "user")
    private List<Submission> submissions;
}
