package com.taskmanager.repository;

import com.taskmanager.entity.Task;
import com.taskmanager.entity.User;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByAssignedTo(User user);

    List<Task> findByProject_Id(Long projectId);

    List<Task> findByProject_IdAndAssignedTo_Id(Long projectId, Long assignedToId);

    boolean existsByProject_IdAndAssignedTo_Id(Long projectId, Long assignedToId);

    List<Task> findByStatus(String status);

    List<Task> findByDeadlineBeforeAndStatusNot(LocalDate date, String status);

    long countByStatus(String status);

    long countByAssignedToAndStatus(User user, String status);

    long countByAssignedToAndDeadlineBeforeAndStatusNot(User user, LocalDate date, String status);
}
