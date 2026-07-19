package com.template.pos.repository;

import com.template.pos.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatusNot(String status);
    List<Order> findByStatusIn(List<String> statuses);
    Optional<Order> findFirstByTableIdAndStatusNot(Long tableId, String status);
}
