
package com.example.taskmanager.controller;

import com.example.taskmanager.dto.AuthRequest;
import com.example.taskmanager.dto.RegisterRequest;
import com.example.taskmanager.model.User;
import com.example.taskmanager.repository.UserRepository;
import com.example.taskmanager.security.JwtService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {
    "http://localhost:5173",
    "https://frontend-sepia-five-73.vercel.app"
})
public class AuthController {

    private final UserRepository repo;
    private final PasswordEncoder enc;
    private final JwtService jwt;

    public AuthController(
            UserRepository repo,
            PasswordEncoder enc,
            JwtService jwt) {
        this.repo = repo;
        this.enc = enc;
        this.jwt = jwt;
    }

    @PostMapping("/register")
    public Map<String, String> register(
            @RequestBody RegisterRequest x) {

        if (repo.findByEmail(x.email()).isPresent()) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Email already registered"
            );
        }

        User user = new User();
        user.setName(x.name());
        user.setEmail(x.email());
        user.setPassword(enc.encode(x.password()));

        repo.save(user);

        return Map.of(
            "token", jwt.generate(user.getEmail()),
            "name", user.getName()
        );
    }

    @PostMapping("/login")
    public Map<String, String> login(
            @RequestBody AuthRequest x) {

        User user = repo.findByEmail(x.email())
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
            ));

        if (!enc.matches(x.password(), user.getPassword())) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
            );
        }

        return Map.of(
            "token", jwt.generate(user.getEmail()),
            "name", user.getName()
        );
    }
}
