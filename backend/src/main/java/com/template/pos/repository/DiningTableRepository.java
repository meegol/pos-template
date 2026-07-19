package com.template.pos.repository;

import com.template.pos.model.DiningTable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {
    Optional<DiningTable> findByTableNumber(String tableNumber);
}
