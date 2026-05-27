package com.celebratehub.controller;

import com.celebratehub.model.EventGuest;
import com.celebratehub.model.GuestMeal;
import com.celebratehub.repository.EventGuestRepository;
import com.celebratehub.repository.EventRepository;
import com.celebratehub.repository.GuestMealRepository;
import com.celebratehub.repository.GuestRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/events/{eventId}/guests")
public class EventGuestController {

    private final EventGuestRepository egRepo;
    private final EventRepository eventRepo;
    private final GuestRepository guestRepo;
    private final GuestMealRepository mealRepo;

    public EventGuestController(EventGuestRepository egRepo, EventRepository eventRepo,
                                GuestRepository guestRepo, GuestMealRepository mealRepo) {
        this.egRepo = egRepo;
        this.eventRepo = eventRepo;
        this.guestRepo = guestRepo;
        this.mealRepo = mealRepo;
    }

    @GetMapping
    public List<EventGuest> list(@PathVariable Long eventId) {
        return egRepo.findByEventId(eventId);
    }

    // Expects JSON body with { guestId: 123, adultsCount: 2, ... }
    @PostMapping
    public ResponseEntity<EventGuest> assign(@PathVariable Long eventId, @RequestBody Map<String, Object> body) {
        Long guestId = Long.valueOf(body.get("guestId").toString());
        return eventRepo.findById(eventId).flatMap(event ->
            guestRepo.findById(guestId).map(guest -> {
                EventGuest eg = new EventGuest();
                eg.setEvent(event);
                eg.setGuest(guest);
                applyFields(eg, body);
                return ResponseEntity.ok(egRepo.save(eg));
            })
        ).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{egId}")
    public ResponseEntity<EventGuest> update(@PathVariable Long eventId,
                                             @PathVariable Long egId,
                                             @RequestBody Map<String, Object> body) {
        if (!eventRepo.existsById(eventId)) return ResponseEntity.notFound().build();
        return egRepo.findById(egId).map(eg -> {
            // Allow changing the guest
            if (body.containsKey("guestId")) {
                Long guestId = Long.valueOf(body.get("guestId").toString());
                guestRepo.findById(guestId).ifPresent(eg::setGuest);
            }
            applyFields(eg, body);
            return ResponseEntity.ok(egRepo.save(eg));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{egId}")
    public ResponseEntity<Void> remove(@PathVariable Long eventId, @PathVariable Long egId) {
        if (!eventRepo.existsById(eventId)) return ResponseEntity.notFound().build();
        if (!egRepo.existsById(egId)) return ResponseEntity.notFound().build();
        egRepo.deleteById(egId);
        return ResponseEntity.noContent().build();
    }

    // --- Meals under EventGuest ---
    @GetMapping("/{egId}/meals")
    public List<GuestMeal> listMeals(@PathVariable Long eventId, @PathVariable Long egId) {
        return mealRepo.findByEventGuestId(egId);
    }

    @PostMapping("/{egId}/meals")
    public ResponseEntity<GuestMeal> createMeal(@PathVariable Long eventId,
                                                @PathVariable Long egId,
                                                @Valid @RequestBody GuestMeal meal) {
        return egRepo.findById(egId).map(eg -> {
            meal.setEventGuest(eg);
            return ResponseEntity.ok(mealRepo.save(meal));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{egId}/meals/{mealId}")
    public ResponseEntity<GuestMeal> updateMeal(@PathVariable Long eventId,
                                                @PathVariable Long egId,
                                                @PathVariable Long mealId,
                                                @Valid @RequestBody GuestMeal body) {
        return mealRepo.findById(mealId).map(m -> {
            m.setMealDate(body.getMealDate());
            m.setBreakfast(body.isBreakfast());
            m.setLunch(body.isLunch());
            m.setSnack(body.isSnack());
            m.setDinner(body.isDinner());
            return ResponseEntity.ok(mealRepo.save(m));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{egId}/meals/{mealId}")
    public ResponseEntity<Void> deleteMeal(@PathVariable Long eventId,
                                           @PathVariable Long egId,
                                           @PathVariable Long mealId) {
        if (!mealRepo.existsById(mealId)) return ResponseEntity.notFound().build();
        mealRepo.deleteById(mealId);
        return ResponseEntity.noContent().build();
    }

    // --- Summary ---
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary(@PathVariable Long eventId) {
        if (!eventRepo.existsById(eventId)) return ResponseEntity.notFound().build();
        List<EventGuest> egs = egRepo.findByEventId(eventId);

        int totalGuests = egs.size();
        int totalAdults = egs.stream().mapToInt(EventGuest::getAdultsCount).sum();
        int totalKids = egs.stream().mapToInt(EventGuest::getKidsCount).sum();
        long needAccommodation = egs.stream().filter(EventGuest::isNeedsAccommodation).count();
        long needTransport = egs.stream().filter(EventGuest::isNeedsTransport).count();
        int transportPeople = egs.stream().filter(EventGuest::isNeedsTransport).mapToInt(EventGuest::getTransportPeopleCount).sum();

        Map<String, Long> byType = new HashMap<>();
        for (EventGuest eg : egs) {
            String type = eg.getGuest().getGuestType() != null ? eg.getGuest().getGuestType() : "OTHER";
            byType.merge(type, 1L, Long::sum);
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalGuests", totalGuests);
        summary.put("totalAdults", totalAdults);
        summary.put("totalKids", totalKids);
        summary.put("totalPeople", totalAdults + totalKids);
        summary.put("needAccommodation", needAccommodation);
        summary.put("needTransport", needTransport);
        summary.put("transportPeople", transportPeople);
        summary.put("byType", byType);

        return ResponseEntity.ok(summary);
    }

    // --- Meal summary by date ---
    @GetMapping("/meal-summary")
    public ResponseEntity<List<Map<String, Object>>> mealSummary(@PathVariable Long eventId) {
        if (!eventRepo.existsById(eventId)) return ResponseEntity.notFound().build();
        List<EventGuest> egs = egRepo.findByEventId(eventId);

        // Collect all meals grouped by date
        Map<String, List<Map<String, Object>>> byDate = new TreeMap<>();
        for (EventGuest eg : egs) {
            for (GuestMeal m : eg.getMeals()) {
                String date = m.getMealDate();
                byDate.computeIfAbsent(date, k -> new ArrayList<>());
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("mealId", m.getId());
                entry.put("eventGuestId", eg.getId());
                if (eg.getGuest() != null) {
                    entry.put("guestName", eg.getGuest().getFirstName() + " " + eg.getGuest().getLastName());
                    entry.put("guestPhone", eg.getGuest().getPhone());
                }
                entry.put("adultsCount", eg.getAdultsCount());
                entry.put("kidsCount", eg.getKidsCount());
                entry.put("headCount", eg.getAdultsCount() + eg.getKidsCount());
                entry.put("breakfast", m.isBreakfast());
                entry.put("lunch", m.isLunch());
                entry.put("snack", m.isSnack());
                entry.put("dinner", m.isDinner());
                byDate.get(date).add(entry);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, List<Map<String, Object>>> e : byDate.entrySet()) {
            Map<String, Object> dateEntry = new LinkedHashMap<>();
            dateEntry.put("date", e.getKey());
            List<Map<String, Object>> guests = e.getValue();
            dateEntry.put("guests", guests);
            int bfCount = 0, bfPeople = 0, luCount = 0, luPeople = 0;
            int snCount = 0, snPeople = 0, diCount = 0, diPeople = 0;
            for (Map<String, Object> g : guests) {
                int hc = (int) g.get("headCount");
                if ((boolean) g.get("breakfast")) { bfCount++; bfPeople += hc; }
                if ((boolean) g.get("lunch"))     { luCount++; luPeople += hc; }
                if ((boolean) g.get("snack"))     { snCount++; snPeople += hc; }
                if ((boolean) g.get("dinner"))    { diCount++; diPeople += hc; }
            }
            Map<String, Object> totals = new LinkedHashMap<>();
            totals.put("breakfastGuests", bfCount); totals.put("breakfastPeople", bfPeople);
            totals.put("lunchGuests", luCount);     totals.put("lunchPeople", luPeople);
            totals.put("snackGuests", snCount);     totals.put("snackPeople", snPeople);
            totals.put("dinnerGuests", diCount);    totals.put("dinnerPeople", diPeople);
            totals.put("totalGuests", guests.size());
            totals.put("totalPeople", guests.stream().mapToInt(g -> (int) g.get("headCount")).sum());
            dateEntry.put("totals", totals);
            result.add(dateEntry);
        }
        return ResponseEntity.ok(result);
    }

    // --- Helper to apply fields from map ---
    private void applyFields(EventGuest eg, Map<String, Object> b) {
        if (b.containsKey("adultsCount")) {
            int v = intVal(b, "adultsCount");
            if (v < 0) throw new IllegalArgumentException("adultsCount cannot be negative");
            eg.setAdultsCount(v);
        }
        if (b.containsKey("kidsCount")) {
            int v = intVal(b, "kidsCount");
            if (v < 0) throw new IllegalArgumentException("kidsCount cannot be negative");
            eg.setKidsCount(v);
        }
        if (b.containsKey("needsTransport")) eg.setNeedsTransport(boolVal(b, "needsTransport"));
        if (b.containsKey("pickupLocation")) eg.setPickupLocation(strVal(b, "pickupLocation"));
        if (b.containsKey("dropOffLocation")) eg.setDropOffLocation(strVal(b, "dropOffLocation"));
        if (b.containsKey("pickupDate")) eg.setPickupDate(strVal(b, "pickupDate"));
        if (b.containsKey("pickupTime")) eg.setPickupTime(strVal(b, "pickupTime"));
        if (b.containsKey("transportPeopleCount")) eg.setTransportPeopleCount(intVal(b, "transportPeopleCount"));
        if (b.containsKey("transportStartDate")) eg.setTransportStartDate(strVal(b, "transportStartDate"));
        if (b.containsKey("transportEndDate")) eg.setTransportEndDate(strVal(b, "transportEndDate"));
        if (b.containsKey("pickupTaskComplete")) eg.setPickupTaskComplete(boolVal(b, "pickupTaskComplete"));
        if (b.containsKey("dropTaskComplete")) eg.setDropTaskComplete(boolVal(b, "dropTaskComplete"));
        if (b.containsKey("needsAccommodation")) eg.setNeedsAccommodation(boolVal(b, "needsAccommodation"));
        if (b.containsKey("accommodationFromDate")) eg.setAccommodationFromDate(strVal(b, "accommodationFromDate"));
        if (b.containsKey("accommodationToDate")) eg.setAccommodationToDate(strVal(b, "accommodationToDate"));
        if (b.containsKey("accommodationPlaceId")) eg.setAccommodationPlaceId(longVal(b, "accommodationPlaceId"));
        if (b.containsKey("accommodationPlaceName")) eg.setAccommodationPlaceName(strVal(b, "accommodationPlaceName"));
        if (b.containsKey("accommodationTaskComplete")) eg.setAccommodationTaskComplete(boolVal(b, "accommodationTaskComplete"));
        if (b.containsKey("attended")) eg.setAttended(boolVal(b, "attended"));
        if (b.containsKey("invitationStatus")) eg.setInvitationStatus(strVal(b, "invitationStatus"));
        if (b.containsKey("invitationNotes")) eg.setInvitationNotes(strVal(b, "invitationNotes"));
        if (b.containsKey("transportHelperId")) eg.setTransportHelperId(longVal(b, "transportHelperId"));
        if (b.containsKey("transportHelperName")) eg.setTransportHelperName(strVal(b, "transportHelperName"));
        if (b.containsKey("accommodationHelperId")) eg.setAccommodationHelperId(longVal(b, "accommodationHelperId"));
        if (b.containsKey("accommodationHelperName")) eg.setAccommodationHelperName(strVal(b, "accommodationHelperName"));
        if (b.containsKey("cookingHelperId")) eg.setCookingHelperId(longVal(b, "cookingHelperId"));
        if (b.containsKey("cookingHelperName")) eg.setCookingHelperName(strVal(b, "cookingHelperName"));
        if (b.containsKey("servingHelperId")) eg.setServingHelperId(longVal(b, "servingHelperId"));
        if (b.containsKey("servingHelperName")) eg.setServingHelperName(strVal(b, "servingHelperName"));
    }

    private String strVal(Map<String, Object> m, String k) { Object v = m.get(k); return v != null ? v.toString() : null; }
    private int intVal(Map<String, Object> m, String k) { Object v = m.get(k); return v != null ? Integer.parseInt(v.toString()) : 0; }
    private boolean boolVal(Map<String, Object> m, String k) { Object v = m.get(k); return v != null && Boolean.parseBoolean(v.toString()); }
    private Long longVal(Map<String, Object> m, String k) { Object v = m.get(k); return v != null && !v.toString().isEmpty() ? Long.valueOf(v.toString()) : null; }
}
