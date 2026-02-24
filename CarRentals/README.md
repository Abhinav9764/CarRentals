# CarRentals

CarRentals is a full-stack car rental management app with a Spring Boot backend and a React (Vite) frontend.

## Features

- User registration and login (`CUSTOMER` or `ADMIN` role)
- View available cars from the backend
- Admin-only car creation from the dashboard
- Booking creation in the UI with local persistence
- Basic operations dashboard (search, sort, insights, activity feed)

## Tech Stack

- Backend: Java 17, Spring Boot 4, Spring Data JPA, MySQL, Lombok
- Frontend: React 19, Vite 7, ESLint

## Project Structure

```text
CarRentals/
  src/main/java/com/app/CarRentals/
    config/
    controllers/
    dto/
    entity/
    repositories/
    services/
  src/main/resources/application.properties
  frontend/
    src/
    package.json
  pom.xml
```

## Prerequisites

- Java 17+
- Node.js 18+ and npm
- MySQL 8+
- Maven (or use wrapper scripts `mvnw` / `mvnw.cmd`)

## Backend Setup

1. Create a MySQL database:

```sql
CREATE DATABASE carDB;
```

2. Configure datasource (optional, defaults shown):

- `SPRING_DATASOURCE_URL` (default: `jdbc:mysql://localhost:3307/carDB`)
- `SPRING_DATASOURCE_USERNAME` (default: `root`)
- `SPRING_DATASOURCE_PASSWORD` (default: `Abhinav@MySQL`)

3. Start backend from project root:

```bash
# Windows
mvnw.cmd spring-boot:run

# macOS/Linux
./mvnw spring-boot:run
```

Backend runs on: `http://localhost:8081`

## Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Start dev server:

```bash
npm run dev
```

Frontend usually runs on: `http://localhost:5173`

The app uses `http://localhost:8081` as default API base URL.

## API Endpoints

Base URL: `http://localhost:8081`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`

Register request body:

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123",
  "role": "CUSTOMER"
}
```

Login request body:

```json
{
  "email": "alice@example.com",
  "password": "secret123"
}
```

### Cars

- `GET /api/cars` (returns only available cars)
- `POST /api/cars/path` (create a car)

Create car request body:

```json
{
  "make": "Toyota",
  "model": "Corolla",
  "available": true,
  "pricePerDay": 89.99
}
```

## Quick cURL Examples

```bash
# Register
curl -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret123","role":"CUSTOMER"}'

# Login
curl -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}'

# Get available cars
curl http://localhost:8081/api/cars

# Create car
curl -X POST http://localhost:8081/api/cars/path \
  -H "Content-Type: application/json" \
  -d '{"make":"Honda","model":"Civic","available":true,"pricePerDay":75.0}'
```

## Known Limitations

- Backend booking service exists, but there is no booking controller endpoint currently exposed.
- Bookings in the current frontend are stored in browser localStorage (`car-rentals-bookings-v1`) and are not persisted to backend.
- Authentication response is used for UI session state; no token-based security flow is implemented.
- Car creation route is currently `POST /api/cars/path`.

## Testing

Backend tests:

```bash
# Windows
mvnw.cmd test

# macOS/Linux
./mvnw test
```

Frontend lint:

```bash
cd frontend
npm run lint
```
