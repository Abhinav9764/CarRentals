package com.app.CarRentals.controllers;
import java.util.List;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import com.app.CarRentals.entity.Car;
import com.app.CarRentals.services.CarService;




@RestController
@RequestMapping("/api/cars")
public class UserController {
    @Autowired
    private final CarService carService;

    public UserController(CarService carService) {
        this.carService = carService;
    }

    @GetMapping
    public List<Car> getAvailableCars() {
        return carService.getAvailableCars();
    }
    
    
    @PostMapping("path")
    public Car postMethodName(@RequestBody Car car) {
        return carService.addCar(car);
    }
    
}
