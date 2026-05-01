package com.taskmanager.dto;

import com.taskmanager.entity.Role;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        String email,
        Role role
) {
    public static final String BEARER = "Bearer";
    public static final long DEFAULT_EXPIRY_SECONDS = 3600L;
}
