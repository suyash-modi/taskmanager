package com.taskmanager.repository;

import com.taskmanager.entity.Task;
import com.taskmanager.entity.User;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByAssignedTo(User user);

    List<Task> findByProject_Id(Long projectId);

    List<Task> findByProject_IdAndAssignedTo_Id(Long projectId, Long assignedToId);

    boolean existsByProject_IdAndAssignedTo_Id(Long projectId, Long assignedToId);

    List<Task> findByStatus(String status);

    List<Task> findByDeadlineBeforeAndStatusNot(LocalDate date, String status);

    long countByStatus(String status);

    /** All tasks not in the given status (e.g. not DONE = still open). */
    long countByStatusNot(String status);

    long countByAssignedToAndStatus(User user, String status);

    long countByAssignedToAndStatusNot(User user, String status);

    long countByAssignedToAndDeadlineBeforeAndStatusNot(User user, LocalDate date, String status);

    long countByProject_CreatedBy_IdAndStatus(Long createdById, String status);

    long countByProject_CreatedBy_IdAndStatusNot(Long createdById, String status);

    @Query("select count(t) from Task t where t.project.createdBy.id = :creatorId "
            + "and t.deadline < :date and t.status <> :done")
    long countOverdueForProjectsCreatedBy(
            @Param("creatorId") Long creatorId,
            @Param("date") LocalDate date,
            @Param("done") String done);
}
