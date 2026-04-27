package com.celebratehub.repository;

import com.celebratehub.model.EventGuest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EventGuestRepository extends JpaRepository<EventGuest, Long> {
    List<EventGuest> findByEventId(Long eventId);
    List<EventGuest> findByGuestId(Long guestId);
    boolean existsByGuestId(Long guestId);

    // --- Cascade helper name updates ---
    @Modifying @Query("UPDATE EventGuest eg SET eg.transportHelperName = :name WHERE eg.transportHelperId = :id")
    int updateTransportHelperName(@Param("id") Long id, @Param("name") String name);

    @Modifying @Query("UPDATE EventGuest eg SET eg.accommodationHelperName = :name WHERE eg.accommodationHelperId = :id")
    int updateAccommodationHelperName(@Param("id") Long id, @Param("name") String name);

    @Modifying @Query("UPDATE EventGuest eg SET eg.cookingHelperName = :name WHERE eg.cookingHelperId = :id")
    int updateCookingHelperName(@Param("id") Long id, @Param("name") String name);

    @Modifying @Query("UPDATE EventGuest eg SET eg.servingHelperName = :name WHERE eg.servingHelperId = :id")
    int updateServingHelperName(@Param("id") Long id, @Param("name") String name);

    // --- Clear helper references on delete ---
    @Modifying @Query("UPDATE EventGuest eg SET eg.transportHelperId = null, eg.transportHelperName = null WHERE eg.transportHelperId = :id")
    int clearTransportHelper(@Param("id") Long id);

    @Query("SELECT eg FROM EventGuest eg WHERE eg.transportHelperId = :id OR eg.accommodationHelperId = :id OR eg.cookingHelperId = :id OR eg.servingHelperId = :id")
    List<EventGuest> findByAnyHelperId(@Param("id") Long id);

    @Modifying @Query("UPDATE EventGuest eg SET eg.accommodationHelperId = null, eg.accommodationHelperName = null WHERE eg.accommodationHelperId = :id")
    int clearAccommodationHelper(@Param("id") Long id);

    @Modifying @Query("UPDATE EventGuest eg SET eg.cookingHelperId = null, eg.cookingHelperName = null WHERE eg.cookingHelperId = :id")
    int clearCookingHelper(@Param("id") Long id);

    @Modifying @Query("UPDATE EventGuest eg SET eg.servingHelperId = null, eg.servingHelperName = null WHERE eg.servingHelperId = :id")
    int clearServingHelper(@Param("id") Long id);

    // --- Cascade accommodation place name updates ---
    @Modifying @Query("UPDATE EventGuest eg SET eg.accommodationPlaceName = :name WHERE eg.accommodationPlaceId = :id")
    int updateAccommodationPlaceName(@Param("id") Long id, @Param("name") String name);

    @Modifying @Query("UPDATE EventGuest eg SET eg.accommodationPlaceId = null, eg.accommodationPlaceName = null WHERE eg.accommodationPlaceId = :id")
    int clearAccommodationPlace(@Param("id") Long id);

    // --- Occupancy query ---
    @Query("SELECT COALESCE(SUM(eg.adultsCount + eg.kidsCount), 0) FROM EventGuest eg WHERE eg.accommodationPlaceId = :placeId")
    int countOccupancy(@Param("placeId") Long placeId);

    // --- Date-aware occupancy: count people whose stay overlaps [fromDate, toDate] ---
    @Query("SELECT COALESCE(SUM(eg.adultsCount + eg.kidsCount), 0) FROM EventGuest eg " +
           "WHERE eg.accommodationPlaceId = :placeId " +
           "AND eg.accommodationFromDate <= :toDate " +
           "AND eg.accommodationToDate >= :fromDate")
    int countOccupancyForDates(@Param("placeId") Long placeId,
                               @Param("fromDate") String fromDate,
                               @Param("toDate") String toDate);

    // --- Get guests at a place overlapping a date range ---
    @Query("SELECT eg FROM EventGuest eg WHERE eg.accommodationPlaceId = :placeId " +
           "AND eg.accommodationFromDate <= :toDate " +
           "AND eg.accommodationToDate >= :fromDate")
    List<EventGuest> findGuestsAtPlaceForDates(@Param("placeId") Long placeId,
                                               @Param("fromDate") String fromDate,
                                               @Param("toDate") String toDate);

    // --- Find event-guests assigned to a helper ---
    @Query("SELECT eg FROM EventGuest eg WHERE eg.transportHelperId = :hid OR eg.accommodationHelperId = :hid OR eg.cookingHelperId = :hid OR eg.servingHelperId = :hid")
    List<EventGuest> findByHelperId(@Param("hid") Long helperId);
}
