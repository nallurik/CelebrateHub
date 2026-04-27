package com.celebratehub.model;

import com.fasterxml.jackson.annotation.JsonBackReference;

import javax.persistence.*;
import javax.validation.constraints.NotBlank;

@Entity
@Table(name = "guest_meals")
public class GuestMeal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    private String mealDate;

    private boolean breakfast;
    private boolean lunch;
    private boolean snack;
    private boolean dinner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_guest_id")
    @JsonBackReference("eg-meals")
    private EventGuest eventGuest;

    public GuestMeal() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMealDate() { return mealDate; }
    public void setMealDate(String mealDate) { this.mealDate = mealDate; }

    public boolean isBreakfast() { return breakfast; }
    public void setBreakfast(boolean breakfast) { this.breakfast = breakfast; }

    public boolean isLunch() { return lunch; }
    public void setLunch(boolean lunch) { this.lunch = lunch; }

    public boolean isSnack() { return snack; }
    public void setSnack(boolean snack) { this.snack = snack; }

    public boolean isDinner() { return dinner; }
    public void setDinner(boolean dinner) { this.dinner = dinner; }

    public EventGuest getEventGuest() { return eventGuest; }
    public void setEventGuest(EventGuest eventGuest) { this.eventGuest = eventGuest; }
}
