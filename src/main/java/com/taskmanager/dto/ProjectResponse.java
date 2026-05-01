package com.taskmanager.dto;

import com.taskmanager.entity.Project;
import java.util.List;

public record ProjectResponse(
        Long id,
        String name,
        String description,
        Long createdById,
        List<Long> memberIds
) {
    public static ProjectResponse fromEntity(Project p) {
        List<Long> mids = p.getMembers() == null
                ? List.of()
                : p.getMembers().stream().map(u -> u.getId()).toList();
        Long creatorId = p.getCreatedBy() != null ? p.getCreatedBy().getId() : null;
        return new ProjectResponse(p.getId(), p.getName(), p.getDescription(), creatorId, mids);
    }
}
