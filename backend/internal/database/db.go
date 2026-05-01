package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Connect(databaseURL string) error {
	var err error
	DB, err = sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("error opening database: %w", err)
	}
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("error connecting to database: %w", err)
	}
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	log.Println("✅ Database connected successfully")
	return nil
}
