package com.template.pos.controller;

import com.template.pos.model.DiningTable;
import com.template.pos.repository.DiningTableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tables")
@CrossOrigin(origins = "*")
public class DiningTableController {

    @Autowired
    private DiningTableRepository tableRepository;

    @GetMapping
    public List<DiningTable> getAllTables() {
        return tableRepository.findAll();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<DiningTable> updateTableStatus(@PathVariable Long id, @RequestParam String status) {
        return tableRepository.findById(id)
                .map(table -> {
                    table.setStatus(status.toUpperCase());
                    return ResponseEntity.ok(tableRepository.save(table));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/setup")
    public ResponseEntity<?> setupInitialTables() {
        if (tableRepository.count() == 0) {
            // Seed 10 tables for testing
            for (int i = 1; i <= 10; i++) {
                int capacity = (i <= 4) ? 2 : (i <= 8) ? 4 : 8; // 2, 4, or 8 pax capacity
                tableRepository.save(new DiningTable(null, "Table " + i, "VACANT", capacity));
            }
            return ResponseEntity.ok("Tables 1 to 10 seeded successfully.");
        }
        return ResponseEntity.badRequest().body("Tables database already has data.");
    }
}
