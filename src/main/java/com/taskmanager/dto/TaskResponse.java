package com.taskmanager.dto;

import com.taskmanager.entity.Task;
import java.time.LocalDate;

public record TaskResponse(
        Long id,
        String title,
        String description,
        String status,
        LocalDate deadline,
        Long projectId,
        Long assignedToUserId
) {
    public static TaskResponse fromEntity(Task t) {
        return new TaskResponse(
                t.getId(),
                t.getTitle(),
                t.getDescription(),
                t.getStatus(),
                t.getDeadline(),
                t.getProject() != null ? t.getProject().getId() : null,
                t.getAssignedTo() != null ? t.getAssignedTo().getId() : null);
    }
}
