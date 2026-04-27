package com.celebratehub.repository;

import com.celebratehub.model.ActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {
    List<ActivityLog> findTop100ByOrderByTimestampDesc();
    List<ActivityLog> findByEntityTypeOrderByTimestampDesc(String entityType);
}
