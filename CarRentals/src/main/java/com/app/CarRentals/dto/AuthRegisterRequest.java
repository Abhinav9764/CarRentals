package com.app.CarRentals.dto;

public record AuthRegisterRequest(String name, String email, String password, String role) {
}
