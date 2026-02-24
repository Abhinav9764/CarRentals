package com.app.CarRentals.repositories;
import org.springframework.data.jpa.repository.JpaRepository;
import com.app.CarRentals.entity.Booking;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByUserId(Long userId);
}
