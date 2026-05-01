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

	rows, err := database.DB.Query(`
		SELECT email, first_name, last_name, phone, created_at 
		FROM users 
		WHERE role = 'hospital' 
		ORDER BY created_at DESC
	`)
	if err != nil {
		log.Fatal("Query failed:", err)
	}
	defer rows.Close()

	fmt.Println("\n=== COMPTES HÔPITAUX ===\n")
	count := 0
	for rows.Next() {
		var email, firstName, lastName, phone, createdAt string
		if err := rows.Scan(&email, &firstName, &lastName, &phone, &createdAt); err != nil {
			continue
		}
		count++
		fmt.Printf("%d. Email: %s\n", count, email)
		fmt.Printf("   Nom: %s %s\n", firstName, lastName)
		fmt.Printf("   Téléphone: %s\n", phone)
		fmt.Printf("   Créé le: %s\n\n", createdAt)
	}

	if count == 0 {
		fmt.Println("Aucun compte hôpital trouvé.")
	} else {
		fmt.Printf("Total: %d compte(s) hôpital\n", count)
	}
}
