package com.taskmanager.controller;

import com.taskmanager.dto.ProjectCreateRequest;
import com.taskmanager.dto.ProjectResponse;
import com.taskmanager.entity.Role;
import com.taskmanager.entity.User;
import com.taskmanager.exception.ForbiddenException;
import com.taskmanager.service.ProjectService;
import com.taskmanager.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;
    private final UserService userService;

    @PostMapping
    public ProjectResponse createProject(
            @Valid @RequestBody ProjectCreateRequest request,
            HttpServletRequest httpRequest) {

        String email = (String) httpRequest.getAttribute("email");
        User creator = userService.getByEmail(email);
        if (!Role.ADMIN.equals(creator.getRole())) {
            throw new ForbiddenException("Only ADMIN can create projects");
        }
        return projectService.create(request, creator);
    }

    @GetMapping
    public List<ProjectResponse> listProjects(HttpServletRequest httpRequest) {
        String email = (String) httpRequest.getAttribute("email");
        User user = userService.getByEmail(email);
        return projectService.listFor(user);
    }

    @GetMapping("/{id}")
    public ProjectResponse getProject(@PathVariable Long id, HttpServletRequest httpRequest) {
        String email = (String) httpRequest.getAttribute("email");
        User user = userService.getByEmail(email);
        return projectService.getById(id, user);
    }
}
