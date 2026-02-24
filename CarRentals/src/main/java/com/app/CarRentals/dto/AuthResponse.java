package com.app.CarRentals.dto;

public record AuthResponse(Long userId, String name, String email, String role, String message) {
}
