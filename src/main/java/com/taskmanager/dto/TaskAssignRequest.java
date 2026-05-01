package com.taskmanager.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TaskAssignRequest {

    @NotNull(message = "assignedToUserId is required")
    private Long assignedToUserId;
}
