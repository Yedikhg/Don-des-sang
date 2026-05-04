package handlers

import (
	"database/sql"
	"fmt"
	"strings"

	"urgence-sang/internal/auth"
	"urgence-sang/internal/database"
	"urgence-sang/internal/models"
	"urgence-sang/pkg/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type DonorHandler struct{}

func NewDonorHandler() *DonorHandler { return &DonorHandler{} }

// GET /api/v1/donors/nearby-alerts
func (h *DonorHandler) NearbyAlerts(c *fiber.Ctx) error {
	donorID := auth.GetUserID(c)
	if _, err := uuid.Parse(donorID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid user id")
	}

	var lat, lng sql.NullFloat64
	var bloodType sql.NullString
	// Avoid prepared statements on some DB poolers.
	err := database.DB.QueryRow(fmt.Sprintf(
		"SELECT latitude, longitude, blood_type FROM users WHERE id = '%s'", donorID,
	)).Scan(&lat, &lng, &bloodType)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error fetching donor profile: "+err.Error())
	}

	if !bloodType.Valid {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Donor blood type not set")
	}
	if !lat.Valid || !lng.Valid {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Donor location not set (latitude/longitude)")
	}

	donorType := models.BloodType(bloodType.String)
	// Get the list of blood types this donor can donate to
	canDonateTo := models.BloodCompatibility[donorType]
	if len(canDonateTo) == 0 {
		return utils.SuccessResponse(c, []models.NearbyAlert{})
	}

	// Inline compatible blood types to avoid prepared statements.
	quoted := make([]string, 0, len(canDonateTo))
	for _, bt := range canDonateTo {
		quoted = append(quoted, fmt.Sprintf("'%s'", string(bt)))
	}

	query := fmt.Sprintf(`
		SELECT
			a.id, a.hospital_id,
			u.first_name||' '||u.last_name AS hospital_name,
			a.blood_type, a.quantity_units, a.video_url,
			a.status, a.latitude, a.longitude, a.created_at,
			ST_Distance(
				ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography,
				ST_SetSRID(ST_MakePoint(%f, %f), 4326)::geography
			) / 1000.0 AS distance_km
		FROM alerts a
		JOIN users u ON u.id = a.hospital_id
		WHERE a.status = 'active'
		  AND a.expires_at > NOW()
		  AND a.blood_type IN (%s)
		  AND ST_DWithin(
		        ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography,
		        ST_SetSRID(ST_MakePoint(%f, %f), 4326)::geography,
		        10000
		      )
		ORDER BY distance_km ASC
		LIMIT 20`,
		lng.Float64, lat.Float64,
		strings.Join(quoted, ","),
		lng.Float64, lat.Float64,
	)

	rows, err := database.DB.Query(query)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error fetching nearby alerts: "+err.Error())
	}
	defer rows.Close()

	alerts := []models.NearbyAlert{}
	for rows.Next() {
		var a models.NearbyAlert
		var videoURL sql.NullString
		if err := rows.Scan(
			&a.ID, &a.HospitalID, &a.HospitalName,
			&a.BloodType, &a.QuantityUnits, &videoURL,
			&a.Status, &a.Latitude, &a.Longitude, &a.CreatedAt,
			&a.DistanceKm,
		); err != nil {
			continue
		}
		
		if videoURL.Valid {
			a.VideoURL = videoURL.String
		}
		
		alerts = append(alerts, a)
	}
	return utils.SuccessResponse(c, alerts)
}

// GET /api/v1/donors/alerts/:id
func (h *DonorHandler) GetAlert(c *fiber.Ctx) error {
	donorID := auth.GetUserID(c)
	alertID := c.Params("id")
	if _, err := uuid.Parse(donorID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid user id")
	}
	if _, err := uuid.Parse(alertID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid alert id")
	}

	var donorLat, donorLng sql.NullFloat64
	var donorBloodType sql.NullString
	err := database.DB.QueryRow(fmt.Sprintf(
		"SELECT latitude, longitude, blood_type FROM users WHERE id = '%s'", donorID,
	)).Scan(&donorLat, &donorLng, &donorBloodType)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error fetching donor profile: "+err.Error())
	}
	if !donorLat.Valid || !donorLng.Valid {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Donor location not set (latitude/longitude)")
	}
	if !donorBloodType.Valid {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Donor blood type not set")
	}

	type AlertDetail struct {
		ID           string           `json:"id"`
		HospitalID   string           `json:"hospital_id"`
		HospitalName string           `json:"hospital_name"`
		HospitalPhone string          `json:"hospital_phone"`
		BloodType    models.BloodType `json:"blood_type"`
		Quantity     int              `json:"quantity_units"`
		VideoURL     string           `json:"video_url"`
		Status       models.AlertStatus `json:"status"`
		HospitalLat  float64          `json:"hospital_lat"`
		HospitalLng  float64          `json:"hospital_lng"`
		DonorLat     float64          `json:"donor_lat"`
		DonorLng     float64          `json:"donor_lng"`
		DistanceKm   float64          `json:"distance_km"`
		CreatedAt    string           `json:"created_at"`
	}

	var d AlertDetail
	// Avoid prepared statements on some DB poolers.
	err = database.DB.QueryRow(fmt.Sprintf(`
		SELECT
			a.id,
			a.hospital_id,
			u.first_name||' '||u.last_name AS hospital_name,
			u.phone AS hospital_phone,
			a.blood_type,
			a.quantity_units,
			COALESCE(a.video_url, ''),
			a.status,
			a.latitude,
			a.longitude,
			%f,
			%f,
			ST_Distance(
				ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326)::geography,
				ST_SetSRID(ST_MakePoint(%f, %f), 4326)::geography
			) / 1000.0 AS distance_km,
			to_char(a.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
		FROM alerts a
		JOIN users u ON u.id = a.hospital_id
		WHERE a.id = '%s'`,
		donorLat.Float64, donorLng.Float64,
		donorLng.Float64, donorLat.Float64,
		alertID,
	)).Scan(
		&d.ID,
		&d.HospitalID,
		&d.HospitalName,
		&d.HospitalPhone,
		&d.BloodType,
		&d.Quantity,
		&d.VideoURL,
		&d.Status,
		&d.HospitalLat,
		&d.HospitalLng,
		&d.DonorLat,
		&d.DonorLng,
		&d.DistanceKm,
		&d.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Alert not found")
	}
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Database error: "+err.Error())
	}

	// Check if the donor can donate to the alert's blood type
	canDonateTo := models.BloodCompatibility[models.BloodType(donorBloodType.String)]
	allowed := false
	for _, bt := range canDonateTo {
		if string(bt) == string(d.BloodType) {
			allowed = true
			break
		}
	}
	if !allowed {
		return utils.ErrorResponse(c, fiber.StatusForbidden, "This alert is not compatible with your blood type")
	}

	return utils.SuccessResponse(c, d)
}

// PATCH /api/v1/donors/status
func (h *DonorHandler) UpdateStatus(c *fiber.Ctx) error {
	donorID := auth.GetUserID(c)
	var body struct {
		Status models.UserStatus `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	valid := map[models.UserStatus]bool{
		models.StatusAvailable:   true,
		models.StatusUnavailable: true,
		models.StatusBusy:        true,
	}
	if !valid[body.Status] {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "status must be 'available', 'unavailable' or 'busy'")
	}
	_, err := database.DB.Exec(
		"UPDATE users SET status=$1, updated_at=NOW() WHERE id=$2",
		string(body.Status), donorID,
	)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error updating status")
	}
	return utils.MessageResponse(c, "Status updated to "+string(body.Status))
}

// PATCH /api/v1/donors/location — update current GPS (donors move; hospitals keep signup location).
func (h *DonorHandler) UpdateLocation(c *fiber.Ctx) error {
	donorID := auth.GetUserID(c)
	if _, err := uuid.Parse(donorID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid user id")
	}
	var body struct {
		Latitude  float64 `json:"latitude"`
		Longitude float64 `json:"longitude"`
	}
	if err := c.BodyParser(&body); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if body.Latitude < -90 || body.Latitude > 90 || body.Longitude < -180 || body.Longitude > 180 {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid coordinates")
	}
	res, err := database.DB.Exec(fmt.Sprintf(
		"UPDATE users SET latitude=%.8f, longitude=%.8f, updated_at=NOW() WHERE id='%s' AND role='donor'",
		body.Latitude, body.Longitude, donorID,
	))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error updating location: "+err.Error())
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Donor profile not found")
	}
	return utils.MessageResponse(c, "Location updated")
}

// POST /api/v1/donors/respond
func (h *DonorHandler) RespondToAlert(c *fiber.Ctx) error {
	donorID := auth.GetUserID(c)
	var req models.RespondAlertRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if req.AlertID == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "alert_id is required")
	}

	var alertStatus models.AlertStatus
	err := database.DB.QueryRow(
		"SELECT status FROM alerts WHERE id = $1", req.AlertID,
	).Scan(&alertStatus)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Alert not found")
	}
	if alertStatus != models.AlertStatusActive {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Alert is no longer active")
	}

	status := models.DonorResponseDeclined
	if req.Accept {
		status = models.DonorResponseEnRoute
	}

	var responseID string
	err = database.DB.QueryRow(`
		INSERT INTO alert_responses (id, alert_id, donor_id, status)
		VALUES (gen_random_uuid(), $1, $2, $3)
		ON CONFLICT (alert_id, donor_id) DO UPDATE SET status=$3, updated_at=NOW()
		RETURNING id`,
		req.AlertID, donorID, string(status),
	).Scan(&responseID)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error recording response")
	}

	if req.Accept {
		_, _ = database.DB.Exec(
			"UPDATE users SET status='busy', updated_at=NOW() WHERE id=$1", donorID,
		)
		_, _ = database.DB.Exec(`
			UPDATE impact_logs
			SET donors_responded = donors_responded + 1, updated_at = NOW()
			WHERE alert_id = $1`, req.AlertID,
		)
	}
	confirmationCode := strings.ToUpper(strings.ReplaceAll(responseID, "-", ""))
	if len(confirmationCode) > 8 {
		confirmationCode = confirmationCode[:8]
	}
	return utils.SuccessResponse(c, fiber.Map{
		"message":           "Response recorded successfully",
		"response_id":       responseID,
		"confirmation_code": confirmationCode,
		"status":            status,
	})
}

// GET /api/v1/donors/history
func (h *DonorHandler) History(c *fiber.Ctx) error {
	donorID := auth.GetUserID(c)
	// Avoid prepared statements on some DB poolers (can cause flaky pq errors).
	if _, err := uuid.Parse(donorID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid user id")
	}
	rows, err := database.DB.Query(fmt.Sprintf(`
		SELECT ar.id, ar.alert_id, ar.status, ar.created_at,
		       a.blood_type,
		       u.first_name||' '||u.last_name AS hospital_name
		FROM alert_responses ar
		JOIN alerts a ON a.id = ar.alert_id
		JOIN users u ON u.id = a.hospital_id
		WHERE ar.donor_id = '%s'
		ORDER BY ar.created_at DESC
		LIMIT 50`, donorID))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error fetching history: "+err.Error())
	}
	defer rows.Close()

	type HistoryItem struct {
		ID           string                     `json:"id"`
		AlertID      string                     `json:"alert_id"`
		Status       models.DonorResponseStatus `json:"status"`
		BloodType    models.BloodType            `json:"blood_type"`
		HospitalName string                     `json:"hospital_name"`
		CreatedAt    string                     `json:"created_at"`
	}
	items := []HistoryItem{}
	for rows.Next() {
		var item HistoryItem
		if err := rows.Scan(&item.ID, &item.AlertID, &item.Status, &item.CreatedAt,
			&item.BloodType, &item.HospitalName); err != nil {
			continue
		}
		items = append(items, item)
	}
	return utils.SuccessResponse(c, items)
}

// GET /api/v1/donors/stats
func (h *DonorHandler) Stats(c *fiber.Ctx) error {
	donorID := auth.GetUserID(c)
	fmt.Printf("[DEBUG] Stats endpoint called with donorID: %s\n", donorID)

	type DonorStats struct {
		DonationCount       int     `json:"donation_count"`
		LivesImpacted       int     `json:"lives_impacted"`
		AlertsReceived      int     `json:"alerts_received"`
		ResponsesAccepted   int     `json:"responses_accepted"`
		ResponsesDeclined   int     `json:"responses_declined"`
		CompletedDonations  int     `json:"completed_donations"`
		ImpactScore         int     `json:"impact_score"`
		LastDonationAt      *string `json:"last_donation_at"`
		NextEligibleAt      *string `json:"next_eligible_at"`
		RankLabel           string  `json:"rank_label"`
	}

	var stats DonorStats

	// Get donation count from user profile
	err := database.DB.QueryRow(
		"SELECT donation_count FROM users WHERE id = $1", donorID,
	).Scan(&stats.DonationCount)
	if err != nil {
		fmt.Printf("[DEBUG] Error getting donation_count: %v\n", err)
	}
	fmt.Printf("[DEBUG] donation_count for donor %s: %d\n", donorID, stats.DonationCount)

	// Calculate lives impacted (estimate: 1 donation = 3 lives)
	stats.LivesImpacted = stats.DonationCount * 3

	// Count alerts received (all responses)
	_ = database.DB.QueryRow(
		"SELECT COUNT(*) FROM alert_responses WHERE donor_id = $1", donorID,
	).Scan(&stats.AlertsReceived)

	// Count accepted responses
	_ = database.DB.QueryRow(
		"SELECT COUNT(*) FROM alert_responses WHERE donor_id = $1 AND status IN ('en_route', 'completed')", donorID,
	).Scan(&stats.ResponsesAccepted)

	// Count declined responses
	_ = database.DB.QueryRow(
		"SELECT COUNT(*) FROM alert_responses WHERE donor_id = $1 AND status = 'declined'", donorID,
	).Scan(&stats.ResponsesDeclined)

	// Count completed donations
	_ = database.DB.QueryRow(
		"SELECT COUNT(*) FROM alert_responses WHERE donor_id = $1 AND status = 'completed'", donorID,
	).Scan(&stats.CompletedDonations)

	// Calculate impact score (completed donations * 100 + accepted responses * 10)
	stats.ImpactScore = stats.CompletedDonations*100 + stats.ResponsesAccepted*10

	// Get last donation date (most recent completed response)
	var lastDonation *string
	err := database.DB.QueryRow(`
		SELECT ar.updated_at::text
		FROM alert_responses ar
		WHERE ar.donor_id = $1 AND ar.status = 'completed'
		ORDER BY ar.updated_at DESC
		LIMIT 1`, donorID,
	).Scan(&lastDonation)
	if err == nil && lastDonation != nil {
		stats.LastDonationAt = lastDonation
	}

	// Calculate next eligible date (last donation + 90 days)
	if stats.LastDonationAt != nil {
		var nextEligible *string
		errNext := database.DB.QueryRow(`
			SELECT (ar.updated_at + interval '90 days')::text
			FROM alert_responses ar
			WHERE ar.donor_id = $1 AND ar.status = 'completed'
			ORDER BY ar.updated_at DESC
			LIMIT 1`, donorID,
		).Scan(&nextEligible)
		
		if errNext == nil && nextEligible != nil {
			stats.NextEligibleAt = nextEligible
		}
	}

	// Determine rank label based on completed donations
	if stats.CompletedDonations == 0 {
		stats.RankLabel = "Nouveau donneur"
	} else if stats.CompletedDonations < 3 {
		stats.RankLabel = "Donneur débutant"
	} else if stats.CompletedDonations < 5 {
		stats.RankLabel = "Donneur régulier"
	} else if stats.CompletedDonations < 10 {
		stats.RankLabel = "Donneur confirmé"
	} else {
		stats.RankLabel = "Donneur d'élite"
	}

	return utils.SuccessResponse(c, stats)
}
