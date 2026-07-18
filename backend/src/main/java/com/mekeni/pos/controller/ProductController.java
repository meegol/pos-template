package com.mekeni.pos.controller;

import com.mekeni.pos.model.Product;
import com.mekeni.pos.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public List<Product> getProducts(@RequestParam(required = false) String category) {
        if (category != null && !category.isEmpty()) {
            return productRepository.findByCategory(category.toUpperCase());
        }
        return productRepository.findAll();
    }

    @GetMapping("/available")
    public List<Product> getAvailableProducts() {
        return productRepository.findByIsAvailableTrue();
    }

    @PutMapping("/{id}/availability")
    public ResponseEntity<Product> toggleAvailability(@PathVariable Long id, @RequestParam Boolean isAvailable) {
        return productRepository.findById(id)
                .map(product -> {
                    product.setIsAvailable(isAvailable);
                    return ResponseEntity.ok(productRepository.save(product));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/setup")
    public ResponseEntity<?> setupInitialProducts() {
        if (productRepository.count() == 0) {
            // Seed signature dishes from Mekeni's Kainan menu
            productRepository.save(new Product(null, "Sizzling Pork Sisig", new BigDecimal("180.00"), "SIZZLING", true, ""));
            productRepository.save(new Product(null, "Sizzling Bulalo in Gravy", new BigDecimal("360.00"), "SIZZLING", true, ""));
            productRepository.save(new Product(null, "Sizzling Beef Tapa Platter", new BigDecimal("220.00"), "SIZZLING", true, ""));
            
            productRepository.save(new Product(null, "Classic Beef Caldereta", new BigDecimal("260.00"), "CLASSIC", true, ""));
            productRepository.save(new Product(null, "Pork Kare-Kare sa Gata", new BigDecimal("240.00"), "CLASSIC", true, ""));
            productRepository.save(new Product(null, "Sinigang na Baboy", new BigDecimal("220.00"), "CLASSIC", true, ""));
            
            productRepository.save(new Product(null, "Signature Tapsilog", new BigDecimal("120.00"), "SILOG", true, ""));
            productRepository.save(new Product(null, "Sisig-log Meal", new BigDecimal("120.00"), "SILOG", true, ""));
            
            productRepository.save(new Product(null, "Creamy Leche Flan", new BigDecimal("90.00"), "DESSERT", true, ""));
            productRepository.save(new Product(null, "Special Halo-Halo", new BigDecimal("130.00"), "DESSERT", true, ""));
            
            productRepository.save(new Product(null, "Unlimited House Iced Tea", new BigDecimal("50.00"), "DRINK", true, ""));
            productRepository.save(new Product(null, "Fresh Lemonade Jug", new BigDecimal("120.00"), "DRINK", true, ""));
            productRepository.save(new Product(null, "Soda in Can", new BigDecimal("60.00"), "DRINK", true, ""));
            
            return ResponseEntity.ok("Mekeni menu catalog seeded successfully (13 items).");
        }
        return ResponseEntity.badRequest().body("Products database already has data.");
    }
}
