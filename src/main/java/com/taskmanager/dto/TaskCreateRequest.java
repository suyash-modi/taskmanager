package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import lombok.Data;

@Data
public class TaskCreateRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 300)
    private String title;

    @Size(max = 5000)
    private String description;

    /** Defaults to TODO if omitted */
    @Size(max = 50)
    private String status;

    private LocalDate deadline;

    @NotNull(message = "projectId is required")
    private Long projectId;

    private Long assignedToUserId;
}
