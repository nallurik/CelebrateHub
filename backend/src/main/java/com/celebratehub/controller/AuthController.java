package com.celebratehub.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String ADMIN_USER = "admin";
    private static final String ADMIN_PASS = "admin";

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.getOrDefault("username", "");
        String password = credentials.getOrDefault("password", "");

        if (ADMIN_USER.equals(username) && ADMIN_PASS.equals(password)) {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "username", username,
                "role", "ADMIN"
            ));
        }

        return ResponseEntity.status(401).body(Map.of(
            "success", false,
            "message", "Invalid username or password"
        ));
    }
}
