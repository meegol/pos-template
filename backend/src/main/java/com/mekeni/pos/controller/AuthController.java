package com.mekeni.pos.controller;

import com.mekeni.pos.dto.LoginRequest;
import com.mekeni.pos.dto.LoginResponse;
import com.mekeni.pos.model.User;
import com.mekeni.pos.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .filter(user -> user.getPasswordHash().equals(request.getPassword())) // simple mock password check
                .map(user -> ResponseEntity.ok(new LoginResponse(
                        user.getId(),
                        user.getUsername(),
                        user.getRole(),
                        user.getFullName(),
                        UUID.randomUUID().toString() // Mock token
                )))
                .orElse(ResponseEntity.status(401).body(null));
    }

    @PostMapping("/setup")
    public ResponseEntity<?> setupInitialStaff() {
        if (userRepository.count() == 0) {
            // Seed a default admin and waiter for testing
            User admin = userRepository.save(new User(null, "admin", "admin123", "ADMIN", "Ian Admin"));
            User waiter1 = userRepository.save(new User(null, "elaine", "waiter123", "WAITER", "Elaine Cruz"));
            User waiter2 = userRepository.save(new User(null, "waiter", "waiter123", "WAITER", "Juan Dela Cruz"));
            return ResponseEntity.ok("Staff accounts seeded: admin/admin123, elaine/waiter123, waiter/waiter123");
        }
        return ResponseEntity.badRequest().body("Users table already has data.");
    }
}
