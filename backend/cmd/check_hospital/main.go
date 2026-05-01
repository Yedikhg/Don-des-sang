package main

import (
	"log"
	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
)

func main() {
	config.Load()
	if err := database.Connect(config.App.DatabaseURL); err != nil {
		log.Fatal("Database connection failed:", err)
	}
	log.Println("✅ Database connected successfully")

	email := "eventmetemeta@gmail.com"
	
	// Get user info
	var userID, firstName, lastName string
	err := database.DB.QueryRow(`
		SELECT id, first_name, last_name 
		FROM users 
		WHERE email = $1`, email).Scan(&userID, &firstName, &lastName)
	
	if err != nil {
		log.Fatal("User not found:", err)
	}
	
	log.Printf("User: %s %s (ID: %s)", firstName, lastName, userID)
	
	// Check hospital verification
	var hospitalName string
	var isVerified bool
	err = database.DB.QueryRow(`
		SELECT hospital_name, is_verified 
		FROM hospital_verifications 
		WHERE user_id = $1`, userID).Scan(&hospitalName, &isVerified)
	
	if err != nil {
		log.Printf("❌ No hospital verification found: %v", err)
		return
	}
	
	log.Printf("Hospital: %s", hospitalName)
	log.Printf("Verified: %t", isVerified)
	
	if !isVerified {
		log.Println("🔧 Verifying hospital...")
		_, err = database.DB.Exec(`
			UPDATE hospital_verifications 
			SET is_verified = true 
			WHERE user_id = $1`, userID)
		
		if err != nil {
			log.Fatal("Failed to verify hospital:", err)
		}
		
		log.Println("✅ Hospital verified successfully!")
	} else {
		log.Println("✅ Hospital already verified")
	}
}