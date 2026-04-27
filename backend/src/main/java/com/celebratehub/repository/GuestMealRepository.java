package com.celebratehub.repository;

import com.celebratehub.model.GuestMeal;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GuestMealRepository extends JpaRepository<GuestMeal, Long> {
    List<GuestMeal> findByEventGuestId(Long eventGuestId);
}
