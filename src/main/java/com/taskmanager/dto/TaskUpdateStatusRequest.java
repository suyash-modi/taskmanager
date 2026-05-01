package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TaskUpdateStatusRequest {

    @NotBlank(message = "status is required")
    @Size(max = 50)
    private String status;
}
