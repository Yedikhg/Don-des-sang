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
		log.Fatalf("Database connection error: %v", err)
	}

	query := `
		SELECT id, first_name, last_name, COALESCE(blood_type, 'Non renseigné'), COALESCE(latitude, 0), COALESCE(longitude, 0)
		FROM users
		WHERE role = 'donor'
	`
	rows, err := database.DB.Query(query)
	if err != nil {
		log.Fatalf("Query error: %v", err)
	}
	defer rows.Close()

	fmt.Println("==================================================")
	fmt.Println("Détails des donneurs :")
	fmt.Println("==================================================")

	count := 0
	for rows.Next() {
		count++
		var id, firstName, lastName, bloodType string
		var lat, lng float64

		if err := rows.Scan(&id, &firstName, &lastName, &bloodType, &lat, &lng); err != nil {
			log.Printf("Erreur lors de la lecture d'une ligne : %v", err)
			continue
		}

		fmt.Printf("Donneur #%d\n", count)
		fmt.Printf("  • ID             : %s\n", id)
		fmt.Printf("  • Nom            : %s %s\n", firstName, lastName)
		fmt.Printf("  • Groupe Sanguin : %s\n", bloodType)

		if lat == 0 && lng == 0 {
			fmt.Println("  • Localisation   : Non renseignée")
		} else {
			fmt.Printf("  • Localisation   : Latitude %.4f, Longitude %.4f\n", lat, lng)
		}
		fmt.Println("--------------------------------------------------")
	}

	if err := rows.Err(); err != nil {
		log.Fatalf("Row iteration error: %v", err)
	}
}
