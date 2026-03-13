package com.emart.payment.repository;

import com.emart.payment.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /** All orders for a user — newest first (order history page). */
    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);

    /** Find by order number (human-readable ID shown to user). */
    Optional<Order> findByOrderNumber(String orderNumber);

    /** Find specific order ensuring it belongs to the requesting user. */
    Optional<Order> findByIdAndUserId(Long id, String userId);

    /** Count user's orders for sequence generation. */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.userId = :userId")
    long countByUserId(@Param("userId") String userId);

    /** Total successful orders count for sequence-based order numbers. */
    @Query("SELECT COUNT(o) FROM Order o")
    long countAll();
}
