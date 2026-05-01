package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Role  string `json:"role"`
	} `json:"user"`
}

func main() {
	// Test login
	loginReq := LoginRequest{
		Email:    "eventmetemeta@gmail.com",
		Password: "password123",
	}
	
	jsonData, _ := json.Marshal(loginReq)
	resp, err := http.Post("http://localhost:8080/api/v1/auth/login", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Fatal("Login failed:", err)
	}
	defer resp.Body.Close()
	
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("Login response (%d): %s\n", resp.StatusCode, string(body))
	
	if resp.StatusCode != 200 {
		log.Fatal("Login failed with status:", resp.StatusCode)
	}
	
	var authResp struct {
		Data AuthResponse `json:"data"`
	}
	json.Unmarshal(body, &authResp)
	
	token := authResp.Data.Token
	fmt.Printf("Token: %s\n", token[:50]+"...")
	
	// Test alerts endpoint
	req, _ := http.NewRequest("GET", "http://localhost:8080/api/v1/hospitals/alerts", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	
	client := &http.Client{}
	resp2, err := client.Do(req)
	if err != nil {
		log.Fatal("Alerts request failed:", err)
	}
	defer resp2.Body.Close()
	
	body2, _ := io.ReadAll(resp2.Body)
	fmt.Printf("Alerts response (%d): %s\n", resp2.StatusCode, string(body2))
}