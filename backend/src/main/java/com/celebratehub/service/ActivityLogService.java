package com.celebratehub.service;

import com.celebratehub.model.ActivityLog;
import com.celebratehub.repository.ActivityLogRepository;
import org.springframework.stereotype.Service;

@Service
public class ActivityLogService {

    private final ActivityLogRepository repo;

    public ActivityLogService(ActivityLogRepository repo) {
        this.repo = repo;
    }

    public void log(String action, String entityType, Long entityId, String entityName, String details) {
        repo.save(new ActivityLog(action, entityType, entityId, entityName, details));
    }
}
