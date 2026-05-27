package com.celebratehub.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "event_guests", uniqueConstraints = @UniqueConstraint(columnNames = {"event_id", "guest_id"}))
public class EventGuest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    @JsonBackReference("event-eventguests")
    private Event event;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "guest_id", nullable = false)
    private Guest guest;

    private int adultsCount = 1;
    private int kidsCount = 0;

    // TRANSPORT
    private boolean needsTransport;
    private String pickupLocation;
    private String dropOffLocation;
    private String pickupDate;
    private String pickupTime;
    private int transportPeopleCount;
    private String transportStartDate;
    private String transportEndDate;
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean pickupTaskComplete;
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean dropTaskComplete;

    // ACCOMMODATION
    private boolean needsAccommodation;
    private String accommodationFromDate;
    private String accommodationToDate;
    private Long accommodationPlaceId;
    private String accommodationPlaceName;
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean accommodationTaskComplete;

    // ATTENDANCE
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean attended;

    // INVITATION
    @Column(length = 20, columnDefinition = "varchar(20) default 'PENDING'")
    private String invitationStatus = "PENDING";
    @Column(length = 500)
    private String invitationNotes;

    // HELPER ASSIGNMENTS (by category)
    private Long transportHelperId;
    private String transportHelperName;
    private Long accommodationHelperId;
    private String accommodationHelperName;
    private Long cookingHelperId;
    private String cookingHelperName;
    private Long servingHelperId;
    private String servingHelperName;

    @OneToMany(mappedBy = "eventGuest", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("eg-meals")
    @Fetch(FetchMode.SUBSELECT)
    private List<GuestMeal> meals = new ArrayList<>();

    public EventGuest() {}

    // --- Getters & Setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }

    public Guest getGuest() { return guest; }
    public void setGuest(Guest guest) { this.guest = guest; }

    public int getAdultsCount() { return adultsCount; }
    public void setAdultsCount(int adultsCount) { this.adultsCount = adultsCount; }

    public int getKidsCount() { return kidsCount; }
    public void setKidsCount(int kidsCount) { this.kidsCount = kidsCount; }

    public boolean isNeedsTransport() { return needsTransport; }
    public void setNeedsTransport(boolean needsTransport) { this.needsTransport = needsTransport; }

    public String getPickupLocation() { return pickupLocation; }
    public void setPickupLocation(String pickupLocation) { this.pickupLocation = pickupLocation; }

    public String getDropOffLocation() { return dropOffLocation; }
    public void setDropOffLocation(String dropOffLocation) { this.dropOffLocation = dropOffLocation; }

    public String getPickupDate() { return pickupDate; }
    public void setPickupDate(String pickupDate) { this.pickupDate = pickupDate; }

    public String getPickupTime() { return pickupTime; }
    public void setPickupTime(String pickupTime) { this.pickupTime = pickupTime; }

    public int getTransportPeopleCount() { return transportPeopleCount; }
    public void setTransportPeopleCount(int transportPeopleCount) { this.transportPeopleCount = transportPeopleCount; }

    public String getTransportStartDate() { return transportStartDate; }
    public void setTransportStartDate(String transportStartDate) { this.transportStartDate = transportStartDate; }

    public String getTransportEndDate() { return transportEndDate; }
    public void setTransportEndDate(String transportEndDate) { this.transportEndDate = transportEndDate; }

    public boolean isPickupTaskComplete() { return pickupTaskComplete; }
    public void setPickupTaskComplete(boolean pickupTaskComplete) { this.pickupTaskComplete = pickupTaskComplete; }

    public boolean isDropTaskComplete() { return dropTaskComplete; }
    public void setDropTaskComplete(boolean dropTaskComplete) { this.dropTaskComplete = dropTaskComplete; }

    public boolean isNeedsAccommodation() { return needsAccommodation; }
    public void setNeedsAccommodation(boolean needsAccommodation) { this.needsAccommodation = needsAccommodation; }

    public String getAccommodationFromDate() { return accommodationFromDate; }
    public void setAccommodationFromDate(String accommodationFromDate) { this.accommodationFromDate = accommodationFromDate; }

    public String getAccommodationToDate() { return accommodationToDate; }
    public void setAccommodationToDate(String accommodationToDate) { this.accommodationToDate = accommodationToDate; }

    public Long getAccommodationPlaceId() { return accommodationPlaceId; }
    public void setAccommodationPlaceId(Long accommodationPlaceId) { this.accommodationPlaceId = accommodationPlaceId; }

    public String getAccommodationPlaceName() { return accommodationPlaceName; }
    public void setAccommodationPlaceName(String accommodationPlaceName) { this.accommodationPlaceName = accommodationPlaceName; }

    public boolean isAccommodationTaskComplete() { return accommodationTaskComplete; }
    public void setAccommodationTaskComplete(boolean accommodationTaskComplete) { this.accommodationTaskComplete = accommodationTaskComplete; }

    public boolean isAttended() { return attended; }
    public void setAttended(boolean attended) { this.attended = attended; }

    public String getInvitationStatus() { return invitationStatus != null ? invitationStatus : "PENDING"; }
    public void setInvitationStatus(String invitationStatus) { this.invitationStatus = invitationStatus; }

    public String getInvitationNotes() { return invitationNotes; }
    public void setInvitationNotes(String invitationNotes) { this.invitationNotes = invitationNotes; }

    public Long getTransportHelperId() { return transportHelperId; }
    public void setTransportHelperId(Long transportHelperId) { this.transportHelperId = transportHelperId; }
    public String getTransportHelperName() { return transportHelperName; }
    public void setTransportHelperName(String transportHelperName) { this.transportHelperName = transportHelperName; }

    public Long getAccommodationHelperId() { return accommodationHelperId; }
    public void setAccommodationHelperId(Long accommodationHelperId) { this.accommodationHelperId = accommodationHelperId; }
    public String getAccommodationHelperName() { return accommodationHelperName; }
    public void setAccommodationHelperName(String accommodationHelperName) { this.accommodationHelperName = accommodationHelperName; }

    public Long getCookingHelperId() { return cookingHelperId; }
    public void setCookingHelperId(Long cookingHelperId) { this.cookingHelperId = cookingHelperId; }
    public String getCookingHelperName() { return cookingHelperName; }
    public void setCookingHelperName(String cookingHelperName) { this.cookingHelperName = cookingHelperName; }

    public Long getServingHelperId() { return servingHelperId; }
    public void setServingHelperId(Long servingHelperId) { this.servingHelperId = servingHelperId; }
    public String getServingHelperName() { return servingHelperName; }
    public void setServingHelperName(String servingHelperName) { this.servingHelperName = servingHelperName; }

    public List<GuestMeal> getMeals() { return meals; }
    public void setMeals(List<GuestMeal> meals) { this.meals = meals; }
}
