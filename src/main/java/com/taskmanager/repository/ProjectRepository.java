package com.taskmanager.repository;

import com.taskmanager.entity.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("select distinct p from Project p left join fetch p.members m left join fetch p.createdBy where p.id = :id")
    Optional<Project> findByIdWithAssociations(@Param("id") Long id);

    @Query("select distinct p from Project p left join fetch p.members m left join fetch p.createdBy "
            + "where p.createdBy.id = :userId or m.id = :userId")
    List<Project> findAccessibleByUserId(@Param("userId") Long userId);
}
