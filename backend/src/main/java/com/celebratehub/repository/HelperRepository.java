package com.celebratehub.repository;

import com.celebratehub.model.Helper;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HelperRepository extends JpaRepository<Helper, Long> {
    Optional<Helper> findByPhoneAndPassword(String phone, String password);
}
