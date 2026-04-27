package com.celebratehub.controller;

import com.celebratehub.model.ActivityLog;
import com.celebratehub.repository.ActivityLogRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activity-logs")
public class ActivityLogController {

    private final ActivityLogRepository repo;

    public ActivityLogController(ActivityLogRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<ActivityLog> list(@RequestParam(required = false) String entityType) {
        if (entityType != null && !entityType.isEmpty()) {
            return repo.findByEntityTypeOrderByTimestampDesc(entityType);
        }
        return repo.findTop100ByOrderByTimestampDesc();
    }
}
