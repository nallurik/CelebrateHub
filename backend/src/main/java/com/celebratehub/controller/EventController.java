package com.celebratehub.controller;

import com.celebratehub.model.Event;
import com.celebratehub.model.Schedule;
import com.celebratehub.repository.EventRepository;
import com.celebratehub.service.ActivityLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventRepository repo;
    private final ActivityLogService activityLog;

    public EventController(EventRepository repo, ActivityLogService activityLog) {
        this.repo = repo;
        this.activityLog = activityLog;
    }

    @GetMapping
    public List<Event> list() {
        return repo.findAllByOrderByDateDesc();
    }

    @PostMapping
    public Event create(@Valid @RequestBody Event event) {
        Event saved = repo.save(event);
        activityLog.log("CREATE", "Event", saved.getId(), saved.getName(), null);
        return saved;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> get(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Event> update(@PathVariable Long id, @Valid @RequestBody Event body) {
        return repo.findById(id).map(existing -> {
            existing.setName(body.getName());
            existing.setDate(body.getDate());
            existing.setDescription(body.getDescription());
            Event saved = repo.save(existing);
            activityLog.log("UPDATE", "Event", saved.getId(), saved.getName(), null);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        return repo.findById(id).map(ev -> {
            activityLog.log("DELETE", "Event", ev.getId(), ev.getName(), null);
            repo.deleteById(id);
            return ResponseEntity.noContent().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/clone")
    public ResponseEntity<Event> clone(@PathVariable Long id, @RequestBody(required = false) java.util.Map<String, Object> body) {
        return repo.findById(id).map(original -> {
            Event clone = new Event();
            String cloneName = (body != null && body.containsKey("name") && body.get("name") != null && !body.get("name").toString().trim().isEmpty())
                    ? body.get("name").toString().trim()
                    : original.getName() + " (Copy)";
            clone.setName(cloneName);
            clone.setDate(original.getDate());
            clone.setLocation(original.getLocation());
            clone.setDescription(original.getDescription());
            for (Schedule s : original.getSchedules()) {
                Schedule sc = new Schedule();
                sc.setTitle(s.getTitle());
                sc.setScheduleDate(s.getScheduleDate());
                sc.setStartTime(s.getStartTime());
                sc.setEndTime(s.getEndTime());
                sc.setDescription(s.getDescription());
                sc.setEvent(clone);
                clone.getSchedules().add(sc);
            }
            // Copy event guests if requested (default true)
            boolean includeGuests = body == null || !body.containsKey("includeGuests") || Boolean.TRUE.equals(body.get("includeGuests"));
            if (includeGuests && original.getEventGuests() != null) {
                for (com.celebratehub.model.EventGuest eg : original.getEventGuests()) {
                    com.celebratehub.model.EventGuest ceg = new com.celebratehub.model.EventGuest();
                    ceg.setEvent(clone);
                    ceg.setGuest(eg.getGuest());
                    ceg.setAdultsCount(eg.getAdultsCount());
                    ceg.setKidsCount(eg.getKidsCount());
                    ceg.setNeedsTransport(eg.isNeedsTransport());
                    ceg.setPickupLocation(eg.getPickupLocation());
                    ceg.setDropOffLocation(eg.getDropOffLocation());
                    ceg.setPickupDate(eg.getPickupDate());
                    ceg.setPickupTime(eg.getPickupTime());
                    ceg.setTransportPeopleCount(eg.getTransportPeopleCount());
                    ceg.setNeedsAccommodation(eg.isNeedsAccommodation());
                    ceg.setAccommodationFromDate(eg.getAccommodationFromDate());
                    ceg.setAccommodationToDate(eg.getAccommodationToDate());
                    ceg.setAccommodationPlaceId(eg.getAccommodationPlaceId());
                    ceg.setAccommodationPlaceName(eg.getAccommodationPlaceName());
                    ceg.setTransportHelperId(eg.getTransportHelperId());
                    ceg.setTransportHelperName(eg.getTransportHelperName());
                    ceg.setAccommodationHelperId(eg.getAccommodationHelperId());
                    ceg.setAccommodationHelperName(eg.getAccommodationHelperName());
                    ceg.setCookingHelperId(eg.getCookingHelperId());
                    ceg.setCookingHelperName(eg.getCookingHelperName());
                    ceg.setServingHelperId(eg.getServingHelperId());
                    ceg.setServingHelperName(eg.getServingHelperName());
                    clone.getEventGuests().add(ceg);
                }
            }
            return ResponseEntity.ok(repo.save(clone));
        }).map(resp -> {
            Event cloned = resp.getBody();
            if (cloned != null) activityLog.log("CLONE", "Event", cloned.getId(), cloned.getName(), "Cloned from event #" + id);
            return resp;
        }).orElse(ResponseEntity.notFound().build());
    }
}
