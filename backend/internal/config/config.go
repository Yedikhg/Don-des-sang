package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	DatabaseURL   string
	JWTSecret     string
	JWTExpiration int
	AIServiceURL  string
	FirebaseKey   string
	SupabaseURL   string
	SupabaseKey   string
	MaxUploadSize int64
}

var App *Config

func Load() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	jwtExp, _ := strconv.Atoi(getEnv("JWT_EXPIRATION_HOURS", "24"))
	maxUpload, _ := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE_MB", "10"), 10, 64)

	App = &Config{
		Port:          getEnv("PORT", "8080"),
		DatabaseURL:   getEnv("DATABASE_URL", ""),
		JWTSecret:     getEnv("JWT_SECRET", "urgence-sang-super-secret-key-change-in-prod"),
		JWTExpiration: jwtExp,
		AIServiceURL:  getEnv("AI_SERVICE_URL", "http://localhost:5001"),
		FirebaseKey:   getEnv("FIREBASE_SERVER_KEY", ""),
		SupabaseURL:   getEnv("SUPABASE_URL", ""),
		SupabaseKey:   getEnv("SUPABASE_SERVICE_KEY", ""),
		MaxUploadSize: maxUpload * 1024 * 1024,
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
