package com.app.CarRentals.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import com.app.CarRentals.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
}
