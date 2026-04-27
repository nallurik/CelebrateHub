package com.celebratehub.repository;

import com.celebratehub.model.Guest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface GuestRepository extends JpaRepository<Guest, Long> {
    List<Guest> findByPhoneIn(Collection<String> phones);
}
