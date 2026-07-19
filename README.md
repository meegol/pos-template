# Spring Boot + Expo Go Mobile POS System Template

A clean, modular Point-of-Sale (POS) template designed for mobile tablet/phone terminal staff. It features a Java Spring Boot REST API backend, a PostgreSQL database, and a cross-platform Expo Go (React Native) mobile client.

---

## 🛠️ Technology Stack

* **Backend**: Java 21, Spring Boot (Web, JPA Data, Validation), Lombok, Maven.
* **Frontend**: React Native, Expo Go, JavaScript (ES6+), Vanilla Stylesheet.
* **Database**: PostgreSQL (Docker-Compose context), H2 (In-memory testing profiles).

---

## 📂 Repository Structure

```
├── backend/                  # Spring Boot REST API Application
│   ├── src/main/java/        # JPA Entities, Repositories, Controllers, and DTOs
│   ├── src/test/java/        # Controller Integration Tests using H2
│   ├── pom.xml               # Maven configuration
│   └── mvnw                  # Maven wrapper script
├── frontend/                 # Expo Go Mobile Client Application
│   ├── App.js                # Main user flow screens (Login, Table Map, Order Pad, Billing)
│   ├── app.json              # Expo application metadata configuration
│   └── package.json          # Node dependencies
├── database/                 # Database Schemas
│   └── schema.sql            # Core DDL table definitions
└── docker-compose.yml        # PostgreSQL service runner
```

---

## 🚀 Getting Started

### 1. Database Setup
Spin up the preconfigured PostgreSQL database utilizing Docker Compose:
```bash
docker compose up -d
```
*(Loads PostgreSQL on port `5432` and runs the initialization `schema.sql` script).*

### 2. Run the Backend API
Navigate to the `backend` folder and run the boot application:
```bash
cd backend
./mvnw spring-boot:run
```
* **Host**: `http://localhost:8080`
* **Seed Initial Data**: Hit the seed endpoint to automatically populate the database with default staff accounts, dining tables, and catalog items:
  ```bash
  curl -X POST http://localhost:8080/api/auth/setup
  curl -X POST http://localhost:8080/api/tables/setup
  curl -X POST http://localhost:8080/api/products/setup
  ```
* **Verify Tests**:
  ```bash
  ./mvnw clean test
  ```

### 3. Run the Mobile Client
Ensure Node.js is installed, navigate to the `frontend` folder, install npm packages, and start the Expo bundler:
```bash
cd frontend
npm install
npm start
```
* Use your physical mobile phone to scan the generated QR code via the **Expo Go** application (available on iOS App Store & Android Play Store).
* Enter your machine's local IP address on the app login screen to pair the phone with the backend API.
