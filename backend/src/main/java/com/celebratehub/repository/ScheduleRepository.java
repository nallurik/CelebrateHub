package com.celebratehub.repository;

import com.celebratehub.model.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    List<Schedule> findByEventIdOrderByScheduleDateAscStartTimeAsc(Long eventId);
}
