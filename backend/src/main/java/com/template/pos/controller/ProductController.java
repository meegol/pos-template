package com.template.pos.controller;

import com.template.pos.model.Product;
import com.template.pos.repository.ProductRepository;
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
            // Seed a generic starter menu catalog
            productRepository.save(new Product(null, "Sizzling Garlic Ribeye", new BigDecimal("350.00"), "GRILLED", true, ""));
            productRepository.save(new Product(null, "Sizzling Salmon Steak", new BigDecimal("380.00"), "GRILLED", true, ""));
            productRepository.save(new Product(null, "Sizzling Pepper Chicken", new BigDecimal("240.00"), "GRILLED", true, ""));
            
            productRepository.save(new Product(null, "Classic Cheeseburger", new BigDecimal("180.00"), "CLASSIC", true, ""));
            productRepository.save(new Product(null, "Classic Caesar Salad", new BigDecimal("160.00"), "CLASSIC", true, ""));
            productRepository.save(new Product(null, "Classic Tomato Pasta", new BigDecimal("190.00"), "CLASSIC", true, ""));
            
            productRepository.save(new Product(null, "Breakfast Pancake Platter", new BigDecimal("150.00"), "BREAKFAST", true, ""));
            productRepository.save(new Product(null, "Breakfast Bacon & Egg", new BigDecimal("160.00"), "BREAKFAST", true, ""));
            
            productRepository.save(new Product(null, "Chocolate Lava Cake", new BigDecimal("110.00"), "DESSERT", true, ""));
            productRepository.save(new Product(null, "New York Cheesecake", new BigDecimal("130.00"), "DESSERT", true, ""));
            
            productRepository.save(new Product(null, "Iced Caramel Macchiato", new BigDecimal("120.00"), "DRINK", true, ""));
            productRepository.save(new Product(null, "Fresh Lemon Mint Soda", new BigDecimal("90.00"), "DRINK", true, ""));
            productRepository.save(new Product(null, "Cola in Can", new BigDecimal("60.00"), "DRINK", true, ""));
            
            return ResponseEntity.ok("Menu catalog template seeded successfully (13 items).");
        }
        return ResponseEntity.badRequest().body("Products database already has data.");
    }
}
