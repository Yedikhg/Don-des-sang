package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"urgence-sang/internal/config"
)

type DonorForAI struct {
	ID        string  `json:"id"`
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	History   int     `json:"history"`
	BloodType string  `json:"blood_type"`
}

type AIRequest struct {
	HospitalLoc struct {
		Lat float64 `json:"lat"`
		Lng float64 `json:"lng"`
	} `json:"hospital_loc"`
	Donors []DonorForAI `json:"donors"`
}

type AIResponse struct {
	// The Python service returns "ranked_ids". Keep backward compatibility with
	// earlier names too.
	RankedIDs   []string `json:"ranked_ids"`
	RankedDonors []string `json:"ranked_donor_ids"`
}

type AIService struct {
	serviceURL string
	client     *http.Client
}

func NewAIService() *AIService {
	return &AIService{
		serviceURL: config.App.AIServiceURL,
		client:     &http.Client{Timeout: 10 * time.Second},
	}
}

// RankDonors sends donor list to the Python AI service for scoring.
// Falls back to the original order if the AI service is unavailable.
func (s *AIService) RankDonors(req AIRequest) ([]string, error) {
	fallback := func() []string {
		ids := make([]string, len(req.Donors))
		for i, d := range req.Donors {
			ids[i] = d.ID
		}
		return ids
	}

	if s.serviceURL == "" {
		return fallback(), nil
	}

	body, err := json.Marshal(req)
	if err != nil {
		return fallback(), fmt.Errorf("marshaling AI request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(
		context.Background(), http.MethodPost,
		s.serviceURL+"/rank", bytes.NewReader(body),
	)
	if err != nil {
		return fallback(), nil
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(httpReq)
	if err != nil {
		return fallback(), nil
	}
	defer resp.Body.Close()

	var aiResp AIResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
		return fallback(), nil
	}
	ranked := aiResp.RankedDonors
	if len(ranked) == 0 {
		ranked = aiResp.RankedIDs
	}
	if len(ranked) == 0 {
		return fallback(), nil
	}
	return ranked, nil
}
