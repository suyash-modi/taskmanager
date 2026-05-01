package com.taskmanager.service;

import com.taskmanager.dto.ProjectCreateRequest;
import com.taskmanager.dto.ProjectResponse;
import com.taskmanager.entity.Project;
import com.taskmanager.entity.Role;
import com.taskmanager.entity.User;
import com.taskmanager.exception.ForbiddenException;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.ProjectRepository;
import com.taskmanager.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    @Transactional
    public ProjectResponse create(ProjectCreateRequest request, User creator) {
        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setCreatedBy(creator);

        List<User> members = new ArrayList<>();
        members.add(creator);
        if (request.getMemberIds() != null) {
            for (Long uid : request.getMemberIds()) {
                if (uid == null || uid.equals(creator.getId())) {
                    continue;
                }
                User u = userRepository.findById(uid)
                        .orElseThrow(() -> new ResourceNotFoundException("Member user not found: " + uid));
                members.add(u);
            }
        }
        project.setMembers(members);
        Project saved = projectRepository.save(project);
        return ProjectResponse.fromEntity(saved);
    }

    public List<ProjectResponse> listFor(User currentUser, String roleName) {
        if (Role.ADMIN.name().equals(roleName)) {
            return projectRepository.findAll().stream().map(ProjectResponse::fromEntity).toList();
        }
        return projectRepository.findAccessibleByUserId(currentUser.getId()).stream()
                .map(ProjectResponse::fromEntity)
                .toList();
    }

    public ProjectResponse getById(Long id, User currentUser, String roleName) {
        Project p = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));
        if (Role.ADMIN.name().equals(roleName)) {
            return ProjectResponse.fromEntity(p);
        }
        if (!canAccessProject(p, currentUser)) {
            throw new ForbiddenException("You do not have access to this project");
        }
        return ProjectResponse.fromEntity(p);
    }

    public Project getEntityById(Long id) {
        return projectRepository.findByIdWithAssociations(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + id));
    }

    private boolean canAccessProject(Project p, User user) {
        if (p.getMembers() == null) {
            return false;
        }
        return p.getMembers().stream().anyMatch(m -> m.getId().equals(user.getId()));
    }
}
