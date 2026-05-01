package com.taskmanager.controller;

import com.taskmanager.entity.Role;
import com.taskmanager.entity.User;
import com.taskmanager.service.TaskService;
import com.taskmanager.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final TaskService taskService;
    private final UserService userService;

    @GetMapping
    public Map<String, Object> getStats(HttpServletRequest request) {
        String email = (String) request.getAttribute("email");
        User user = userService.getByEmail(email);
        Map<String, Object> data = new HashMap<>();

        if (Role.ADMIN.equals(user.getRole())) {
            Long creatorId = user.getId();
            data.put("completed", taskService.countCompletedForProjectsCreatedBy(creatorId));
            data.put("pending", taskService.countOpenTasksForProjectCreator(creatorId));
            data.put("overdue", taskService.countOverdueForProjectCreator(creatorId));
        } else {
            data.put("completed", taskService.countByStatusForUser(user, "DONE"));
            data.put("pending", taskService.countOpenTasksForUser(user));
            data.put("overdue", taskService.countOverdueForUser(user));
        }
        return data;
    }
}
