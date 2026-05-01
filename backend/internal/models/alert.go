package models

import "time"

type AlertStatus string
type DonorResponseStatus string

const (
	AlertStatusActive    AlertStatus = "active"
	AlertStatusCompleted AlertStatus = "completed"
	AlertStatusCancelled AlertStatus = "cancelled"
)

const (
	DonorResponseAccepted  DonorResponseStatus = "accepted"
	DonorResponseDeclined  DonorResponseStatus = "declined"
	DonorResponseEnRoute   DonorResponseStatus = "en_route"
	DonorResponseCompleted DonorResponseStatus = "completed"
)

type Alert struct {
	ID              string      `json:"id"`
	HospitalID      string      `json:"hospital_id"`
	HospitalName    string      `json:"hospital_name,omitempty"`
	BloodType       BloodType   `json:"blood_type"`
	QuantityUnits   int         `json:"quantity_units"`
	VideoURL        string      `json:"video_url,omitempty"`
	Status          AlertStatus `json:"status"`
	Latitude        float64     `json:"latitude"`
	Longitude       float64     `json:"longitude"`
	MatchedDonors   int         `json:"matched_donors,omitempty"`
	RespondingDonors int        `json:"responding_donors,omitempty"`
	CompletedAt     *time.Time  `json:"completed_at,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
}

type AlertResponse struct {
	ID        string              `json:"id"`
	AlertID   string              `json:"alert_id"`
	DonorID   string              `json:"donor_id"`
	DonorName string              `json:"donor_name,omitempty"`
	BloodType BloodType           `json:"blood_type,omitempty"`
	Status    DonorResponseStatus `json:"status"`
	Distance  float64             `json:"distance_km,omitempty"`
	CreatedAt time.Time           `json:"created_at"`
	UpdatedAt time.Time           `json:"updated_at"`
}

type NearbyAlert struct {
	ID           string      `json:"id"`
	HospitalID   string      `json:"hospital_id"`
	HospitalName string      `json:"hospital_name"`
	BloodType    BloodType   `json:"blood_type"`
	QuantityUnits int        `json:"quantity_units"`
	VideoURL     string      `json:"video_url"`
	Status       AlertStatus `json:"status"`
	Latitude     float64     `json:"latitude"`
	Longitude    float64     `json:"longitude"`
	DistanceKm   float64     `json:"distance_km"`
	CreatedAt    time.Time   `json:"created_at"`
}

type CreateAlertRequest struct {
	BloodType    BloodType `json:"blood_type"`
	QuantityUnits int      `json:"quantity_units"`
}

type RespondAlertRequest struct {
	AlertID string `json:"alert_id"`
	Accept  bool   `json:"accept"`
}

type VerifyDonorRequest struct {
	DonorID          string `json:"donor_id"`
	AlertID          string `json:"alert_id"`
	ConfirmationCode string `json:"confirmation_code"`
}
