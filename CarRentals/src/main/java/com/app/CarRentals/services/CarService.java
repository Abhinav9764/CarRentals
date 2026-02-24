package com.app.CarRentals.services;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.app.CarRentals.entity.Car;
import com.app.CarRentals.repositories.CarRepository;

@Service
public class CarService {
    @Autowired
    private final CarRepository carRepository;

    public List<Car> getAvailableCars() {
        return carRepository.findByAvailableTrue();
    }

    public CarService(CarRepository carRepository) {
        this.carRepository = carRepository;
    }

    public Car addCar(Car car) {
        return carRepository.save(car);
    }

    public Car deleteCar(Long id) {
        Car car = carRepository.findById(id).orElseThrow(() -> new RuntimeException("Car not found"));
        carRepository.delete(car);
        return car;
    }

    public Car updateCar(Long id, Car updatedCar) {
        Car car = carRepository.findById(id).orElseThrow(() -> new RuntimeException("Car not found"));
        car.setMake(updatedCar.getMake());
        car.setModel(updatedCar.getModel());
        car.setAvailable(updatedCar.isAvailable());
        car.setPricePerDay(updatedCar.getPricePerDay());
        return carRepository.save(car);
    }
}
