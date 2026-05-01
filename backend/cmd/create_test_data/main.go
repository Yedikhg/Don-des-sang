package main

import (
	"log"
	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	config.Load()
	if err := database.Connect(config.App.DatabaseURL); err != nil {
		log.Fatal("Database connection failed:", err)
	}
	log.Println("✅ Database connected successfully")

	// Create a test donor
	donorID := uuid.New().String()
	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	
	_, err := database.DB.Exec(`
		INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, blood_type, latitude, longitude, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (email) DO NOTHING`,
		donorID, "testdonor@gmail.com", string(hash), "donor",
		"Test", "Donor", "+243123456789", "A+", 
		-4.3317, 15.3139, "available", // Kinshasa coordinates
	)
	if err != nil {
		log.Printf("Error creating donor: %v", err)
	} else {
		log.Println("✅ Test donor created: testdonor@gmail.com / password123")
	}

	// Get hospital ID
	var hospitalID string
	err = database.DB.QueryRow("SELECT id FROM users WHERE email = 'eventmetemeta@gmail.com'").Scan(&hospitalID)
	if err != nil {
		log.Fatal("Hospital not found:", err)
	}

	// Create a test alert
	alertID := uuid.New().String()
	_, err = database.DB.Exec(`
		INSERT INTO alerts (id, hospital_id, blood_type, quantity_units, status, latitude, longitude, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
		ON CONFLICT (id) DO NOTHING`,
		alertID, hospitalID, "A+", 2, "active", 
		-4.3217, 15.3039, // Close to donor
	)
	if err != nil {
		log.Printf("Error creating alert: %v", err)
	} else {
		log.Printf("✅ Test alert created: %s", alertID)
	}

	log.Println("🎯 Test data created successfully!")
	log.Println("Donor: testdonor@gmail.com / password123 (A+)")
	log.Println("Hospital: eventmetemeta@gmail.com / password123")
	log.Println("Alert: A+ blood type, 2 units needed")
}