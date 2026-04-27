package com.celebratehub.repository;

import com.celebratehub.model.DropOffLocation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DropOffLocationRepository extends JpaRepository<DropOffLocation, Long> {
    List<DropOffLocation> findAllByOrderByNameAsc();
}
