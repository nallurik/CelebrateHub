package com.celebratehub.controller;

import com.celebratehub.model.AccommodationPlace;
import com.celebratehub.model.EventGuest;
import com.celebratehub.model.Helper;
import com.celebratehub.repository.AccommodationPlaceRepository;
import com.celebratehub.repository.EventGuestRepository;
import com.celebratehub.repository.HelperRepository;
import com.celebratehub.service.ActivityLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/helpers")
public class HelperController {

    private final HelperRepository repo;
    private final EventGuestRepository egRepo;
    private final AccommodationPlaceRepository placeRepo;
    private final ActivityLogService activityLog;

    public HelperController(HelperRepository repo, EventGuestRepository egRepo, AccommodationPlaceRepository placeRepo, ActivityLogService activityLog) {
        this.repo = repo;
        this.egRepo = egRepo;
        this.placeRepo = placeRepo;
        this.activityLog = activityLog;
    }

    @GetMapping
    public List<Helper> list() {
        return repo.findAll();
    }

    @PostMapping
    public Helper create(@Valid @RequestBody Helper helper) {
        Helper saved = repo.save(helper);
        activityLog.log("CREATE", "Helper", saved.getId(), saved.getFullName(), "Category: " + saved.getCategory());
        return saved;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Helper> get(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Helper> update(@PathVariable Long id, @Valid @RequestBody Helper body) {
        return repo.findById(id).map(existing -> {
            String oldFullName = existing.getFullName();
            existing.setFirstName(body.getFirstName());
            existing.setLastName(body.getLastName());
            existing.setPhone(body.getPhone());
            existing.setRole(body.getRole());
            existing.setCategory(body.getCategory());
            existing.setActive(body.isActive());
            if (body.getPassword() != null && !body.getPassword().isEmpty()) {
                existing.setPassword(body.getPassword());
            }
            Helper saved = repo.save(existing);
            activityLog.log("UPDATE", "Helper", saved.getId(), saved.getFullName(), null);
            // Cascade name update to all EventGuest references
            if (!oldFullName.equals(saved.getFullName())) {
                egRepo.updateTransportHelperName(id, saved.getFullName());
                egRepo.updateAccommodationHelperName(id, saved.getFullName());
                egRepo.updateCookingHelperName(id, saved.getFullName());
                egRepo.updateServingHelperName(id, saved.getFullName());
            }
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return repo.findById(id).map(h -> {
            var assignments = egRepo.findByAnyHelperId(id);
            if (!assignments.isEmpty()) {
                List<String> eventNames = assignments.stream()
                        .map(eg -> eg.getEvent().getName())
                        .distinct()
                        .collect(Collectors.toList());
                return ResponseEntity.status(409)
                        .body((Object) Map.of("status", 409, "message", "This crew member is assigned to " + eventNames.size() + " event" + (eventNames.size() > 1 ? "s" : "") + ". Remove assignments first.", "events", eventNames));
            }
            activityLog.log("DELETE", "Helper", h.getId(), h.getFullName(), null);
            repo.deleteById(id);
            return (ResponseEntity<?>) ResponseEntity.noContent().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- Crew login ---
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> crewLogin(@RequestBody Map<String, String> credentials) {
        String phone = credentials.getOrDefault("phone", "");
        String password = credentials.getOrDefault("password", "");
        Optional<Helper> helper = repo.findByPhoneAndPassword(phone, password);
        if (helper.isPresent()) {
            Helper h = helper.get();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("success", true);
            result.put("id", h.getId());
            result.put("firstName", h.getFirstName());
            result.put("lastName", h.getLastName());
            result.put("phone", h.getPhone());
            result.put("category", h.getCategory());
            result.put("role", h.getRole());
            return ResponseEntity.ok(result);
        }
        return ResponseEntity.status(401).body(Map.of("success", false, "message", "Invalid phone or password"));
    }

    // --- Get assigned guests for a helper ---
    @GetMapping("/{id}/assignments")
    public ResponseEntity<List<Map<String, Object>>> getAssignments(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        List<EventGuest> egs = egRepo.findByHelperId(id);
        List<Map<String, Object>> result = egs.stream().map(eg -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("eventGuestId", eg.getId());
            if (eg.getGuest() != null) {
                m.put("guestFirstName", eg.getGuest().getFirstName());
                m.put("guestLastName", eg.getGuest().getLastName());
                m.put("guestPhone", eg.getGuest().getPhone());
            }
            if (eg.getEvent() != null) {
                m.put("eventName", eg.getEvent().getName());
                m.put("eventDate", eg.getEvent().getDate());
            }
            m.put("adultsCount", eg.getAdultsCount());
            m.put("kidsCount", eg.getKidsCount());
            // What roles this helper has for this guest
            List<String> roles = new ArrayList<>();
            if (eg.getTransportHelperId() != null && eg.getTransportHelperId().equals(id)) {
                roles.add("Transport");
                m.put("pickupLocation", eg.getPickupLocation());
                m.put("pickupDate", eg.getPickupDate());
                m.put("pickupTime", eg.getPickupTime());
                m.put("transportPeopleCount", eg.getTransportPeopleCount());
                // Drop-off info: accommodation address or event location
                m.put("needsAccommodation", eg.isNeedsAccommodation());
                if (eg.isNeedsAccommodation() && eg.getAccommodationPlaceId() != null) {
                    placeRepo.findById(eg.getAccommodationPlaceId()).ifPresent(place -> {
                        m.put("dropOffLocation", place.getName());
                        m.put("dropOffAddress", place.getAddress());
                        m.put("dropOffContact", place.getContactPerson());
                        m.put("dropOffPhone", place.getContactPhone());
                    });
                } else if (eg.getEvent() != null && eg.getEvent().getLocation() != null) {
                    m.put("dropOffLocation", eg.getEvent().getName() + " venue");
                    m.put("dropOffAddress", eg.getEvent().getLocation());
                }
            }
            if (eg.getAccommodationHelperId() != null && eg.getAccommodationHelperId().equals(id)) {
                roles.add("Accommodation");
                m.put("accommodationPlaceName", eg.getAccommodationPlaceName());
                m.put("accommodationFromDate", eg.getAccommodationFromDate());
                m.put("accommodationToDate", eg.getAccommodationToDate());
            }
            if (eg.getCookingHelperId() != null && eg.getCookingHelperId().equals(id)) roles.add("Cooking");
            if (eg.getServingHelperId() != null && eg.getServingHelperId().equals(id)) roles.add("Serving");
            m.put("assignedRoles", roles);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }
}
