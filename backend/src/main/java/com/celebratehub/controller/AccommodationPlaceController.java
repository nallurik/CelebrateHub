package com.celebratehub.controller;

import com.celebratehub.model.AccommodationPlace;
import com.celebratehub.repository.AccommodationPlaceRepository;
import com.celebratehub.repository.EventGuestRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/accommodation-places")
public class AccommodationPlaceController {

    private final AccommodationPlaceRepository repo;
    private final EventGuestRepository egRepo;

    public AccommodationPlaceController(AccommodationPlaceRepository repo, EventGuestRepository egRepo) {
        this.repo = repo;
        this.egRepo = egRepo;
    }

    @GetMapping
    public List<AccommodationPlace> list() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AccommodationPlace> get(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public AccommodationPlace create(@Valid @RequestBody AccommodationPlace place) {
        return repo.save(place);
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<AccommodationPlace> update(@PathVariable Long id,
                                                     @Valid @RequestBody AccommodationPlace body) {
        return repo.findById(id).map(p -> {
            String oldName = p.getName();
            p.setName(body.getName());
            p.setType(body.getType());
            p.setCapacity(body.getCapacity());
            p.setAddress(body.getAddress());
            p.setContactPerson(body.getContactPerson());
            p.setContactPhone(body.getContactPhone());
            p.setNotes(body.getNotes());
            p.setActive(body.isActive());
            AccommodationPlace saved = repo.save(p);
            // Cascade name update to all EventGuest references
            if (!oldName.equals(saved.getName())) {
                egRepo.updateAccommodationPlaceName(id, saved.getName());
            }
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        // Clear references in EventGuest before deleting
        egRepo.clearAccommodationPlace(id);
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/occupancy")
    public List<Map<String, Object>> occupancy(
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {
        boolean hasDateFilter = fromDate != null && !fromDate.isEmpty() && toDate != null && !toDate.isEmpty();
        return repo.findAll().stream().map(place -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("placeId", place.getId());
            m.put("placeName", place.getName());
            m.put("capacity", place.getCapacity());
            int filled = hasDateFilter
                    ? egRepo.countOccupancyForDates(place.getId(), fromDate, toDate)
                    : egRepo.countOccupancy(place.getId());
            m.put("filled", filled);
            // Include guest details when date-filtered
            if (hasDateFilter) {
                List<Map<String, Object>> guests = egRepo.findGuestsAtPlaceForDates(place.getId(), fromDate, toDate)
                        .stream().map(eg -> {
                            Map<String, Object> gm = new LinkedHashMap<>();
                            if (eg.getGuest() != null) {
                                gm.put("guestName", eg.getGuest().getFirstName() + " " + eg.getGuest().getLastName());
                            }
                            gm.put("adultsCount", eg.getAdultsCount());
                            gm.put("kidsCount", eg.getKidsCount());
                            gm.put("fromDate", eg.getAccommodationFromDate());
                            gm.put("toDate", eg.getAccommodationToDate());
                            if (eg.getEvent() != null) {
                                gm.put("eventName", eg.getEvent().getName());
                            }
                            return gm;
                        }).collect(Collectors.toList());
                m.put("guests", guests);
            }
            return m;
        }).collect(Collectors.toList());
    }
}
