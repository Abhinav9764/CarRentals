package com.app.CarRentals.services;
import java.time.LocalDate;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.app.CarRentals.repositories.*;
import com.app.CarRentals.entity.*;

@Service
public class BookingService {
    @Autowired
    private final BookingRepository bookingRepository;
    
    @Autowired
    private final UserRepository userRepository;

    @Autowired
    private final CarRepository carRepository;

    public BookingService(BookingRepository bookingRepository, UserRepository userRepository, CarRepository carRepository) {
        this.bookingRepository = bookingRepository;
        this.userRepository = userRepository;
        this.carRepository = carRepository;
    }

    public Booking bookCar(Long userId, Long carId, LocalDate startDate, LocalDate endDate) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Car car = carRepository.findById(carId).orElseThrow(() -> new RuntimeException("Car not found"));

        if (!car.isAvailable()) {
            throw new RuntimeException("Car is not available");
        }

        Booking booking = new Booking();
        booking.setUser(user);
        booking.setCar(car);
        booking.setStartDate(startDate);
        booking.setEndDate(endDate);
        car.setAvailable(false);
        booking.setTotalPrice(car.getPricePerDay() * (endDate.toEpochDay() - startDate.toEpochDay()));
        booking.setStatus("BOOKED");
        carRepository.save(car);

        return bookingRepository.save(booking);
    }

    public Booking cancelBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        booking.setStatus("CANCELLED");
        Car car = booking.getCar();
        car.setAvailable(true);
        carRepository.save(car);
        return bookingRepository.save(booking);
    }

    public List<Booking> getUserBookings(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    public Booking updateBooking(Long bookingId, LocalDate newStartDate, LocalDate newEndDate) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow(() -> new RuntimeException("Booking not found"));
        if (booking.getStatus().equals("CANCELLED")) {
            throw new RuntimeException("Cannot update a cancelled booking");
        }
        booking.setStartDate(newStartDate);
        booking.setEndDate(newEndDate);
        return bookingRepository.save(booking);
    }
}
