package main

import (
	"log"
	"urgence-sang/internal/auth"
	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
	"urgence-sang/internal/models"
)

func main() {
	config.Load()
	if err := database.Connect(config.App.DatabaseURL); err != nil {
		log.Fatal("Database connection failed:", err)
	}
	log.Println("✅ Database connected successfully")

	email := "eventmetemeta@gmail.com"
	
	// Get user info
	var userID, role string
	err := database.DB.QueryRow(`
		SELECT id, role 
		FROM users 
		WHERE email = $1`, email).Scan(&userID, &role)
	
	if err != nil {
		log.Fatal("User not found:", err)
	}
	
	log.Printf("User ID: %s", userID)
	log.Printf("Role: %s", role)
	
	// Generate token
	token, err := auth.GenerateToken(userID, email, models.Role(role))
	if err != nil {
		log.Fatal("Error generating token:", err)
	}
	
	log.Printf("✅ New token generated:")
	log.Printf("Token: %s", token)
	log.Println("\n📋 Copy this token and paste it in browser console:")
	log.Printf("localStorage.setItem('token', '%s')", token)
}