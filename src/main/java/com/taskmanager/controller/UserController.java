package com.taskmanager.controller;

import com.taskmanager.dto.AuthRequest;
import com.taskmanager.dto.LoginResponse;
import com.taskmanager.dto.SignupRequest;
import com.taskmanager.dto.UserResponse;
import com.taskmanager.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/signup")
    public UserResponse signup(@Valid @RequestBody SignupRequest request) {
        return userService.signup(request);
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody AuthRequest request) {
        return userService.login(request.getEmail(), request.getPassword());
    }
}
