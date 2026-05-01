package com.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.Data;

@Data
public class ProjectCreateRequest {

    @NotBlank(message = "Project name is required")
    @Size(max = 200)
    private String name;

    @Size(max = 2000)
    private String description;

    /** Optional member user IDs (excluding creator if desired) */
    private List<Long> memberIds;
}
