package models

import "time"

type ImpactLog struct {
	ID               string    `json:"id"`
	AlertID          string    `json:"alert_id"`
	DonorsInRadius   int       `json:"donors_in_radius"`
	DonorsNotified   int       `json:"donors_notified"`
	DonorsResponded  int       `json:"donors_responded"`
	DonorsArrived    int       `json:"donors_arrived"`
	AIRankingUsed    bool      `json:"ai_ranking_used"`
	ResponseTimeMin  *int      `json:"response_time_min,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type ImpactReport struct {
	AlertID          string    `json:"alert_id"`
	HospitalName     string    `json:"hospital_name"`
	BloodType        BloodType `json:"blood_type"`
	DonorsInRadius   int       `json:"donors_in_radius"`
	DonorsNotified   int       `json:"donors_notified"`
	DonorsResponded  int       `json:"donors_responded"`
	DonorsArrived    int       `json:"donors_arrived"`
	AIRankingUsed    bool      `json:"ai_ranking_used"`
	ResponseTimeMin  *int      `json:"response_time_min,omitempty"`
	ConversionRate   float64   `json:"conversion_rate_pct"`
	CreatedAt        time.Time `json:"created_at"`
}
