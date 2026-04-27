package com.celebratehub.controller;

import com.celebratehub.model.Schedule;
import com.celebratehub.repository.EventRepository;
import com.celebratehub.repository.ScheduleRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/events/{eventId}/schedules")
public class ScheduleController {

    private final ScheduleRepository scheduleRepo;
    private final EventRepository eventRepo;

    public ScheduleController(ScheduleRepository scheduleRepo, EventRepository eventRepo) {
        this.scheduleRepo = scheduleRepo;
        this.eventRepo = eventRepo;
    }

    @GetMapping
    public List<Schedule> list(@PathVariable Long eventId) {
        return scheduleRepo.findByEventIdOrderByScheduleDateAscStartTimeAsc(eventId);
    }

    @PostMapping
    public ResponseEntity<Schedule> create(@PathVariable Long eventId, @Valid @RequestBody Schedule schedule) {
        return eventRepo.findById(eventId).map(event -> {
            schedule.setEvent(event);
            return ResponseEntity.ok(scheduleRepo.save(schedule));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Schedule> update(@PathVariable Long eventId,
                                           @PathVariable Long id,
                                           @Valid @RequestBody Schedule body) {
        if (!eventRepo.existsById(eventId)) return ResponseEntity.notFound().build();
        return scheduleRepo.findById(id).map(e -> {
            e.setTitle(body.getTitle());
            e.setScheduleDate(body.getScheduleDate());
            e.setStartTime(body.getStartTime());
            e.setEndTime(body.getEndTime());
            e.setDescription(body.getDescription());
            return ResponseEntity.ok(scheduleRepo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long eventId, @PathVariable Long id) {
        if (!eventRepo.existsById(eventId)) return ResponseEntity.notFound().build();
        if (!scheduleRepo.existsById(id)) return ResponseEntity.notFound().build();
        scheduleRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
