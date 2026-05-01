package com.taskmanager.controller;

import com.taskmanager.dto.UserResponse;
import com.taskmanager.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserQueryController {

    private final UserService userService;

    @GetMapping("/{id}")
    public UserResponse getById(@PathVariable Long id) {
        return userService.getByIdResponse(id);
    }
}

