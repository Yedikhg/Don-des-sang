package models

import "time"

type HospitalVerification struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	HospitalName    string     `json:"hospital_name"`
	LicenseURL      string     `json:"license_url"`
	IsVerified      bool       `json:"is_verified"`
	VerifiedAt      *time.Time `json:"verified_at,omitempty"`
	VerifiedByAdmin string     `json:"verified_by_admin,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}
