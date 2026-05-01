package com.taskmanager.service;

import com.taskmanager.dto.TaskAssignRequest;
import com.taskmanager.dto.TaskCreateRequest;
import com.taskmanager.dto.TaskResponse;
import com.taskmanager.dto.TaskUpdateStatusRequest;
import com.taskmanager.entity.Project;
import com.taskmanager.entity.Role;
import com.taskmanager.entity.Task;
import com.taskmanager.entity.User;
import com.taskmanager.exception.ForbiddenException;
import com.taskmanager.exception.ResourceNotFoundException;
import com.taskmanager.repository.TaskRepository;
import com.taskmanager.repository.UserRepository;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectService projectService;
    private final UserRepository userRepository;

    @Transactional
    public TaskResponse create(TaskCreateRequest request) {
        Project project = projectService.getEntityById(request.getProjectId());
        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setStatus(
                request.getStatus() != null && !request.getStatus().isBlank()
                        ? request.getStatus()
                        : "TODO");
        task.setDeadline(request.getDeadline());
        task.setProject(project);
        if (request.getAssignedToUserId() != null) {
            User assignee = userRepository.findById(request.getAssignedToUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee not found: "
                            + request.getAssignedToUserId()));
            task.setAssignedTo(assignee);
        }
        Task saved = taskRepository.save(task);
        return TaskResponse.fromEntity(saved);
    }

    public List<TaskResponse> listByProject(Long projectId, User currentUser) {
        Project project = projectService.getEntityById(projectId);
        ensureProjectAccess(project, currentUser);
        List<Task> tasks = Role.ADMIN.equals(currentUser.getRole())
                ? taskRepository.findByProject_Id(projectId)
                : taskRepository.findByProject_IdAndAssignedTo_Id(projectId, currentUser.getId());
        return tasks.stream()
                .map(TaskResponse::fromEntity)
                .toList();
    }

    public List<Task> getUserTasks(User user) {
        return taskRepository.findByAssignedTo(user);
    }

    public List<TaskResponse> getUserTaskResponses(User user) {
        return taskRepository.findByAssignedTo(user).stream()
                .map(TaskResponse::fromEntity)
                .toList();
    }

    public List<Task> getOverdueTasks() {
        return taskRepository.findByDeadlineBeforeAndStatusNot(LocalDate.now(), "DONE");
    }

    public long countByStatus(String status) {
        return taskRepository.countByStatus(status);
    }

    public long countByStatusForUser(User user, String status) {
        return taskRepository.countByAssignedToAndStatus(user, status);
    }

    /** Tasks still open (not DONE), for dashboard "pending". */
    public long countOpenTasks() {
        return taskRepository.countByStatusNot("DONE");
    }

    public long countOpenTasksForUser(User user) {
        return taskRepository.countByAssignedToAndStatusNot(user, "DONE");
    }

    public long countOverdueForUser(User user) {
        return taskRepository.countByAssignedToAndDeadlineBeforeAndStatusNot(
                user, LocalDate.now(), "DONE");
    }

    @Transactional
    public TaskResponse updateStatus(Long taskId, TaskUpdateStatusRequest request, User currentUser) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));
        if (Role.ADMIN.equals(currentUser.getRole())) {
            task.setStatus(request.getStatus());
            return TaskResponse.fromEntity(taskRepository.save(task));
        }
        if (task.getAssignedTo() == null || !task.getAssignedTo().getId().equals(currentUser.getId())) {
            throw new ForbiddenException("You can only update tasks assigned to you");
        }
        task.setStatus(request.getStatus());
        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    @Transactional
    public TaskResponse assign(Long taskId, TaskAssignRequest request) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found: " + taskId));
        User assignee = userRepository.findById(request.getAssignedToUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.getAssignedToUserId()));
        task.setAssignedTo(assignee);
        return TaskResponse.fromEntity(taskRepository.save(task));
    }

    private void ensureProjectAccess(Project project, User currentUser) {
        if (Role.ADMIN.equals(currentUser.getRole())) {
            return;
        }
        if (project.getMembers() != null
                && project.getMembers().stream().anyMatch(m -> m.getId().equals(currentUser.getId()))) {
            return;
        }
        if (project.getId() != null
                && taskRepository.existsByProject_IdAndAssignedTo_Id(project.getId(), currentUser.getId())) {
            return;
        }
        throw new ForbiddenException("You do not have access to this project");
    }
}
