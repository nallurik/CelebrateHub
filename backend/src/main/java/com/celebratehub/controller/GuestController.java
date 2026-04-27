package com.celebratehub.controller;

import com.celebratehub.model.Guest;
import com.celebratehub.repository.EventGuestRepository;
import com.celebratehub.repository.GuestRepository;
import com.celebratehub.service.ActivityLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/guests")
public class GuestController {

    private final GuestRepository guestRepo;
    private final EventGuestRepository egRepo;
    private final ActivityLogService activityLog;

    public GuestController(GuestRepository guestRepo, EventGuestRepository egRepo, ActivityLogService activityLog) {
        this.guestRepo = guestRepo;
        this.egRepo = egRepo;
        this.activityLog = activityLog;
    }

    @GetMapping
    public List<Guest> list() {
        return guestRepo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Guest> get(@PathVariable Long id) {
        return guestRepo.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Guest create(@Valid @RequestBody Guest guest) {
        Guest saved = guestRepo.save(guest);
        activityLog.log("CREATE", "Guest", saved.getId(), saved.getFirstName() + " " + saved.getLastName(), null);
        return saved;
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> bulkCreate(@RequestBody List<Guest> guests) {
        // Collect phones from incoming list and find existing ones
        java.util.Set<String> incomingPhones = guests.stream()
                .map(Guest::getPhone).filter(p -> p != null && !p.isBlank())
                .collect(java.util.stream.Collectors.toSet());
        java.util.Set<String> existingPhones = guestRepo.findByPhoneIn(incomingPhones).stream()
                .map(Guest::getPhone).collect(java.util.stream.Collectors.toSet());
        List<Guest> newGuests = guests.stream()
                .filter(g -> g.getPhone() != null && !existingPhones.contains(g.getPhone()))
                .collect(java.util.stream.Collectors.toList());
        int skipped = guests.size() - newGuests.size();
        List<Guest> saved = newGuests.isEmpty() ? List.of() : guestRepo.saveAll(newGuests);
        if (!saved.isEmpty()) {
            activityLog.log("IMPORT", "Guest", null, null, saved.size() + " guests imported");
        }
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("imported", saved.size());
        result.put("skipped", skipped);
        result.put("guests", saved);
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Guest> update(@PathVariable Long id, @Valid @RequestBody Guest body) {
        return guestRepo.findById(id).map(g -> {
            g.setFirstName(body.getFirstName());
            g.setLastName(body.getLastName());
            g.setEmail(body.getEmail());
            g.setPhone(body.getPhone());
            g.setReferencePerson(body.getReferencePerson());
            g.setGuestType(body.getGuestType());
            g.setCountry(body.getCountry());
            g.setState(body.getState());
            g.setDistrict(body.getDistrict());
            g.setVillage(body.getVillage());
            return ResponseEntity.ok(guestRepo.save(g));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return guestRepo.findById(id).map(g -> {
            var assignments = egRepo.findByGuestId(id);
            if (!assignments.isEmpty()) {
                List<String> eventNames = assignments.stream()
                        .map(eg -> eg.getEvent().getName())
                        .distinct()
                        .collect(Collectors.toList());
                return ResponseEntity.status(409)
                        .body((Object) Map.of("status", 409, "message", "This guest is assigned to " + eventNames.size() + " event" + (eventNames.size() > 1 ? "s" : "") + ". Remove assignments first.", "events", eventNames));
            }
            activityLog.log("DELETE", "Guest", g.getId(), g.getFirstName() + " " + g.getLastName(), null);
            guestRepo.deleteById(id);
            return ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
