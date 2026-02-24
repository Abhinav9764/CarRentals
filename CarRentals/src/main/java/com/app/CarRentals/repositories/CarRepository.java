package com.app.CarRentals.repositories;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.app.CarRentals.entity.Car;

public interface CarRepository extends JpaRepository<Car, Long> {
    List<Car> findByAvailableTrue();
}
