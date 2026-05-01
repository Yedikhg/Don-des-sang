package models

import "time"

type Role string
type BloodType string
type UserStatus string

const (
	RoleDonor    Role = "donor"
	RoleHospital Role = "hospital"
	RoleAdmin    Role = "admin"
)

const (
	BloodTypeAPos  BloodType = "A+"
	BloodTypeANeg  BloodType = "A-"
	BloodTypeBPos  BloodType = "B+"
	BloodTypeBNeg  BloodType = "B-"
	BloodTypeABPos BloodType = "AB+"
	BloodTypeABNeg BloodType = "AB-"
	BloodTypeOPos  BloodType = "O+"
	BloodTypeONeg  BloodType = "O-"
)

const (
	StatusAvailable   UserStatus = "available"
	StatusUnavailable UserStatus = "unavailable"
	StatusBusy        UserStatus = "busy"
)

type User struct {
	ID            string     `json:"id"`
	Email         string     `json:"email"`
	PasswordHash  string     `json:"-"`
	Role          Role       `json:"role"`
	FirstName     string     `json:"first_name"`
	LastName      string     `json:"last_name"`
	Phone         string     `json:"phone"`
	BloodType     BloodType  `json:"blood_type,omitempty"`
	Latitude      float64    `json:"latitude,omitempty"`
	Longitude     float64    `json:"longitude,omitempty"`
	Status        UserStatus `json:"status"`
	FCMToken      string     `json:"fcm_token,omitempty"`
	DonationCount int        `json:"donation_count"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type RegisterRequest struct {
	Email        string    `json:"email"`
	Password     string    `json:"password"`
	Role         Role      `json:"role"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Phone        string    `json:"phone"`
	BloodType    BloodType `json:"blood_type,omitempty"`
	Latitude     float64   `json:"latitude,omitempty"`
	Longitude    float64   `json:"longitude,omitempty"`
	HospitalName string    `json:"hospital_name,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FCMToken string `json:"fcm_token,omitempty"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}
