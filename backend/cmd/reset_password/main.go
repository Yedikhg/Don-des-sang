package main

import (
	"log"
	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	config.Load()
	if err := database.Connect(config.App.DatabaseURL); err != nil {
		log.Fatal("Database connection failed:", err)
	}
	log.Println("✅ Database connected successfully")

	email := "eventmetemeta@gmail.com"
	newPassword := "password123"
	
	// Hash the new password
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Error hashing password:", err)
	}
	
	// Update password
	result, err := database.DB.Exec(`
		UPDATE users 
		SET password_hash = $1 
		WHERE email = $2`, string(hash), email)
	
	if err != nil {
		log.Fatal("Error updating password:", err)
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		log.Fatal("No user found with email:", email)
	}
	
	log.Printf("✅ Password reset successfully for %s", email)
	log.Printf("New password: %s", newPassword)
}