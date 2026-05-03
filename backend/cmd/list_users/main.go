package main

import (
	"fmt"
	"log"
	"time"

	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
)

func main() {
	config.Load()
	if err := database.Connect(config.App.DatabaseURL); err != nil {
		log.Fatalf("Database connection error: %v", err)
	}

	query := `
		SELECT id, email, role, first_name, last_name, phone, blood_type, status, created_at, password_hash
		FROM users
		ORDER BY created_at DESC
	`
	rows, err := database.DB.Query(query)
	if err != nil {
		log.Fatalf("Query error: %v", err)
	}
	defer rows.Close()

	fmt.Println("====================================================================================")
	fmt.Println("LISTE DES UTILISATEURS ENREGISTRÉS")
	fmt.Println("====================================================================================")

	count := 0
	for rows.Next() {
		count++
		var id, email, role, firstName, lastName, phone, status, passwordHash string
		var bloodType *string
		var createdAt time.Time

		if err := rows.Scan(&id, &email, &role, &firstName, &lastName, &phone, &bloodType, &status, &createdAt, &passwordHash); err != nil {
			log.Printf("Erreur lors de la lecture d'une ligne : %v", err)
			continue
		}

		fmt.Printf("Utilisateur #%d\n", count)
		fmt.Printf("  • ID             : %s\n", id)
		fmt.Printf("  • Email          : %s\n", email)
		fmt.Printf("  • Rôle           : %s\n", role)
		fmt.Printf("  • Nom complet    : %s %s\n", firstName, lastName)
		fmt.Printf("  • Téléphone      : %s\n", phone)
		if bloodType != nil {
			fmt.Printf("  • Groupe sanguin : %s\n", *bloodType)
		} else {
			fmt.Println("  • Groupe sanguin : Non renseigné")
		}
		fmt.Printf("  • Statut         : %s\n", status)
		fmt.Printf("  • Inscription    : %s\n", createdAt.Format("02/01/2006 à 15:04:05"))
		fmt.Printf("  • Mot de passe   : (haché) %s...\n", passwordHash[:30])
		fmt.Println("------------------------------------------------------------------------------------")
	}

	if err := rows.Err(); err != nil {
		log.Fatalf("Row iteration error: %v", err)
	}

	fmt.Printf("\n✅ Nombre total d'utilisateurs : %d\n", count)
	fmt.Println("====================================================================================")
}
