package main

import (
	"fmt"
	"log"

	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
)

func main() {
	config.Load()

	if err := database.Connect(config.App.DatabaseURL); err != nil {
		log.Fatal("Database connection failed:", err)
	}

	emails := []string{
		"yedikjunior@gmail.com",
		"gugujuniorshy5558988@gmail.com",
		"gugujuniorshy55589@gmail.com",
		"gugujuniorshy555@gmail.com",
		"test.hospital.372715337@example.com",
		"test.hospital@example.com",
	}

	fmt.Println("\n=== SUPPRESSION DES COMPTES HÔPITAUX ===\n")

	for _, email := range emails {
		// Get user ID first
		var userID string
		err := database.DB.QueryRow("SELECT id FROM users WHERE email = $1", email).Scan(&userID)
		if err != nil {
			fmt.Printf("❌ %s - Compte non trouvé\n", email)
			continue
		}

		// Delete related records first
		database.DB.Exec("DELETE FROM hospital_verifications WHERE user_id = $1", userID)
		database.DB.Exec("DELETE FROM alert_responses WHERE alert_id IN (SELECT id FROM alerts WHERE hospital_id = $1)", userID)
		database.DB.Exec("DELETE FROM impact_logs WHERE alert_id IN (SELECT id FROM alerts WHERE hospital_id = $1)", userID)
		database.DB.Exec("DELETE FROM alerts WHERE hospital_id = $1", userID)
		
		// Delete user
		result, err := database.DB.Exec("DELETE FROM users WHERE id = $1", userID)
		if err != nil {
			fmt.Printf("❌ %s - Erreur lors de la suppression: %v\n", email, err)
			continue
		}

		rows, _ := result.RowsAffected()
		if rows > 0 {
			fmt.Printf("✅ %s - Supprimé avec succès\n", email)
		}
	}

	fmt.Println("\n=== SUPPRESSION TERMINÉE ===\n")
}
