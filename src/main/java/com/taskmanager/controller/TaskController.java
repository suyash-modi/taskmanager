package com.taskmanager.controller;

import com.taskmanager.dto.TaskAssignRequest;
import com.taskmanager.dto.TaskCreateRequest;
import com.taskmanager.dto.TaskResponse;
import com.taskmanager.dto.TaskUpdateStatusRequest;
import com.taskmanager.entity.Role;
import com.taskmanager.entity.User;
import com.taskmanager.exception.ForbiddenException;
import com.taskmanager.service.TaskService;
import com.taskmanager.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;
    private final UserService userService;

    @PostMapping
    public TaskResponse createTask(
            @Valid @RequestBody TaskCreateRequest request,
            HttpServletRequest httpRequest) {

        String email = (String) httpRequest.getAttribute("email");
        User user = userService.getByEmail(email);
        if (!Role.ADMIN.equals(user.getRole())) {
            throw new ForbiddenException("Only ADMIN can create tasks");
        }
        return taskService.create(request, user);
    }

    @GetMapping("/project/{projectId}")
    public List<TaskResponse> listByProject(
            @PathVariable Long projectId,
            HttpServletRequest httpRequest) {
        String email = (String) httpRequest.getAttribute("email");
        User user = userService.getByEmail(email);
        return taskService.listByProject(projectId, user);
    }

    @PutMapping("/{id}/status")
    public TaskResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody TaskUpdateStatusRequest request,
            HttpServletRequest httpRequest) {
        String email = (String) httpRequest.getAttribute("email");
        User user = userService.getByEmail(email);
        return taskService.updateStatus(id, request, user);
    }

    @PutMapping("/{id}/assign")
    public TaskResponse assign(
            @PathVariable Long id,
            @Valid @RequestBody TaskAssignRequest request,
            HttpServletRequest httpRequest) {
        String email = (String) httpRequest.getAttribute("email");
        User user = userService.getByEmail(email);
        if (!Role.ADMIN.equals(user.getRole())) {
            throw new ForbiddenException("Only ADMIN can assign tasks");
        }
        return taskService.assign(id, request, user);
    }

    @GetMapping("/my")
    public List<TaskResponse> getMyTasks(HttpServletRequest httpRequest) {
        String email = (String) httpRequest.getAttribute("email");
        User user = userService.getByEmail(email);
        return taskService.getUserTaskResponses(user);
    }
}
