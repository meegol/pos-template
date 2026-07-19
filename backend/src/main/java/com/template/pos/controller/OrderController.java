package com.template.pos.controller;

import com.template.pos.dto.OrderItemRequest;
import com.template.pos.dto.OrderRequest;
import com.template.pos.model.*;
import com.template.pos.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private DiningTableRepository tableRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @PostMapping
    public ResponseEntity<?> placeOrder(@RequestBody OrderRequest request) {
        DiningTable table = tableRepository.findById(request.getTableId()).orElse(null);
        User waiter = userRepository.findById(request.getWaiterId()).orElse(null);

        if (table == null) return ResponseEntity.badRequest().body("Dining Table not found");
        if (waiter == null) return ResponseEntity.badRequest().body("Staff member not found");

        // Check if there is already an open order for this table
        Order order = orderRepository.findFirstByTableIdAndStatusNot(table.getId(), "PAID").orElse(null);
        boolean isNewOrder = false;

        if (order == null) {
            order = new Order();
            order.setTable(table);
            order.setWaiter(waiter);
            order.setStatus("PREPARING"); // starts directly in preparation
            order.setCreatedAt(LocalDateTime.now());
            order.setTotalAmount(BigDecimal.ZERO);
            order.setItems(new ArrayList<>());
            isNewOrder = true;
        }

        BigDecimal additionalTotal = BigDecimal.ZERO;

        for (OrderItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId()).orElse(null);
            if (product == null || !product.getIsAvailable()) {
                return ResponseEntity.badRequest().body("Product ID " + itemReq.getProductId() + " not found or unavailable.");
            }

            // Create OrderItem
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setProduct(product);
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(product.getPrice());
            item.setSpecialInstructions(itemReq.getSpecialInstructions());

            order.getItems().add(item);
            
            BigDecimal itemCost = product.getPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            additionalTotal = additionalTotal.add(itemCost);
        }

        order.setTotalAmount(order.getTotalAmount().add(additionalTotal));
        
        // Save order
        Order savedOrder = orderRepository.save(order);

        // Update table state to occupied
        table.setStatus("OCCUPIED");
        tableRepository.save(table);

        return ResponseEntity.ok(savedOrder);
    }

    @GetMapping("/active")
    public List<Order> getActiveOrders() {
        // Return orders that are PREPARING, PENDING, or DELIVERED (active kitchen/floor items)
        return orderRepository.findByStatusIn(Arrays.asList("PENDING", "PREPARING", "DELIVERED"));
    }

    @GetMapping("/table/{tableId}")
    public ResponseEntity<Order> getActiveOrderForTable(@PathVariable Long tableId) {
        return orderRepository.findFirstByTableIdAndStatusNot(tableId, "PAID")
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Order> updateOrderStatus(@PathVariable Long id, @RequestParam String status) {
        return orderRepository.findById(id)
                .map(order -> {
                    order.setStatus(status.toUpperCase());
                    return ResponseEntity.ok(orderRepository.save(order));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/pay")
    public ResponseEntity<?> recordPayment(@PathVariable Long id) {
        return orderRepository.findById(id)
                .map(order -> {
                    order.setStatus("PAID");
                    orderRepository.save(order);

                    // Reset associated table to vacant
                    DiningTable table = order.getTable();
                    table.setStatus("VACANT");
                    tableRepository.save(table);

                    return ResponseEntity.ok("Order " + id + " marked as PAID. Table " + table.getTableNumber() + " is now VACANT.");
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
