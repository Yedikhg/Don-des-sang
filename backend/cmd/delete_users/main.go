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

	userIDs := []string{
		"c93c49ec-3f83-42db-8286-702bed8dfdaa",
		"2354a690-aebb-4272-aa77-43963289a879",
		"33481bfb-6de5-4cf6-862c-bf1cba8ccd4b",
		"284a5eff-ff32-40dd-a234-4fbfdc5093f4",
		"bcee3735-5219-4ed5-acf0-3d1a756db615",
		"15f6aa3f-560b-4c31-99d9-148c2417f252",
		"9c3088ea-debd-4e98-8369-7c130a7f1f7a",
	}

	fmt.Println("====================================================================================")
	fmt.Println("SUPPRESSION DES UTILISATEURS")
	fmt.Println("====================================================================================")

	deletedCount := 0
	for _, userID := range userIDs {
		result, err := database.DB.Exec("DELETE FROM users WHERE id = $1", userID)
		if err != nil {
			log.Printf("Erreur lors de la suppression de l'utilisateur %s : %v", userID, err)
			continue
		}

		rowsAffected, _ := result.RowsAffected()
		if rowsAffected > 0 {
			fmt.Printf("✅ Utilisateur supprimé : %s\n", userID)
			deletedCount++
		} else {
			fmt.Printf("⚠️ Utilisateur non trouvé : %s\n", userID)
		}
	}

	fmt.Println("------------------------------------------------------------------------------------")
	fmt.Printf("✅ Nombre total d'utilisateurs supprimés : %d\n", deletedCount)
	fmt.Println("====================================================================================")
}
