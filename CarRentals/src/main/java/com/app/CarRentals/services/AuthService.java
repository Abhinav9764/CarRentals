package com.app.CarRentals.services;

import com.app.CarRentals.dto.AuthLoginRequest;
import com.app.CarRentals.dto.AuthRegisterRequest;
import com.app.CarRentals.dto.AuthResponse;
import com.app.CarRentals.entity.User;
import com.app.CarRentals.repositories.UserRepository;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public AuthResponse register(AuthRegisterRequest request) {
        String name = required(request.name(), "Name");
        String email = normalizeEmail(request.email());
        String password = required(request.password(), "Password");
        String role = normalizeRole(request.role());

        if (password.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters.");
        }

        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);

        try {
            User saved = userRepository.save(user);
            return toResponse(saved, "Registration successful.");
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
    }

    public AuthResponse login(AuthLoginRequest request) {
        String email = normalizeEmail(request.email());
        String password = required(request.password(), "Password");

        User user = userRepository
            .findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password.");
        }

        return toResponse(user, "Login successful.");
    }

    private AuthResponse toResponse(User user, String message) {
        return new AuthResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), message);
    }

    private String required(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " is required.");
        }
        return value.trim();
    }

    private String normalizeEmail(String email) {
        return required(email, "Email").toLowerCase(Locale.ROOT);
    }

    private String normalizeRole(String role) {
        String normalized = required(role, "Role").toUpperCase(Locale.ROOT);
        if (!"CUSTOMER".equals(normalized) && !"ADMIN".equals(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role must be CUSTOMER or ADMIN.");
        }
        return normalized;
    }
}
