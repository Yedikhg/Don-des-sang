package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"urgence-sang/internal/auth"
	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
	"urgence-sang/internal/models"
	"urgence-sang/internal/services"
	"urgence-sang/pkg/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type HospitalHandler struct {
	storage  *services.StorageService
	ai       *services.AIService
	firebase *services.FirebaseService
}

func NewHospitalHandler() *HospitalHandler {
	return &HospitalHandler{
		storage:  services.NewStorageService(),
		ai:       services.NewAIService(),
		firebase: services.NewFirebaseService(),
	}
}

// POST /api/v1/hospitals/alerts
func (h *HospitalHandler) CreateAlert(c *fiber.Ctx) error {
	hospitalID := auth.GetUserID(c)

	// TEMPORAIRE: Désactivation de la vérification hôpital pour les tests
	// TODO: Réactiver quand la partie admin sera codée
	/*
	var isVerified bool
	err := database.DB.QueryRow(
		"SELECT is_verified FROM hospital_verifications WHERE user_id = $1", hospitalID,
	).Scan(&isVerified)
	if errors.Is(err, sql.ErrNoRows) || !isVerified {
		return utils.ErrorResponse(c, fiber.StatusForbidden, "Hospital not verified. Please wait for admin approval.")
	}
	*/

	var lat, lng float64
	_ = database.DB.QueryRow("SELECT latitude, longitude FROM users WHERE id = $1", hospitalID).Scan(&lat, &lng)

	bloodType := models.BloodType(c.FormValue("blood_type"))
	if bloodType == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "blood_type is required")
	}
	quantityUnits := 1
	fmt.Sscanf(c.FormValue("quantity_units", "1"), "%d", &quantityUnits)
	if quantityUnits < 1 {
		quantityUnits = 1
	}

	videoURL := ""
	videoFile, err := utils.ExtractVideoFile(c, "video", config.App.MaxUploadSize)
	if err == nil {
		videoURL, _ = h.storage.UploadFile(videoFile, "alert-videos")
	}

	expiresInHours := 2
	fmt.Sscanf(c.FormValue("expires_in_hours", "2"), "%d", &expiresInHours)
	if expiresInHours < 1 {
		expiresInHours = 2
	}

	alertID := uuid.New().String()
	_, err = database.DB.Exec(`
		INSERT INTO alerts (id, hospital_id, blood_type, quantity_units, video_url, status, latitude, longitude, expires_at)
		VALUES ($1,$2,$3,$4,$5,'active',$6,$7, NOW() + $8 * interval '1 hour')`,
		alertID, hospitalID, string(bloodType), quantityUnits, videoURL, lat, lng, expiresInHours,
	)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error creating alert: "+err.Error())
	}

	compatibleTypes := models.GetCompatibleDonorTypes(bloodType)
	donors, _ := h.findNearbyDonors(lat, lng, compatibleTypes, 5000)

	matchedCount := 0
	notifiedCount := 0
	aiUsed := false

	if len(donors) > 0 {
		matchedCount = len(donors)
		aiReq := services.AIRequest{}
		aiReq.HospitalLoc.Lat = lat
		aiReq.HospitalLoc.Lng = lng
		for _, d := range donors {
			aiReq.Donors = append(aiReq.Donors, services.DonorForAI{
				ID: d.ID, Lat: d.Latitude, Lng: d.Longitude,
				History: d.DonationCount, BloodType: string(d.BloodType),
			})
		}
		rankedIDs, _ := h.ai.RankDonors(aiReq)
		aiUsed = config.App.AIServiceURL != ""

		limit := 50
		if len(rankedIDs) < limit {
			limit = len(rankedIDs)
		}
		donorMap := make(map[string]models.User, len(donors))
		for _, d := range donors {
			donorMap[d.ID] = d
		}
		for _, id := range rankedIDs[:limit] {
			if donor, ok := donorMap[id]; ok && donor.FCMToken != "" {
				notifiedCount++
				go h.firebase.SendToToken(
					donor.FCMToken,
					"🩸 Urgence — Don de Sang",
					fmt.Sprintf("Groupe %s requis. Vous êtes à proximité.", bloodType),
					map[string]string{"alert_id": alertID, "type": "blood_alert"},
				)
			}
		}
	}

	// Log impact pour le jury et les statistiques
	_, _ = database.DB.Exec(`
		INSERT INTO impact_logs (id, alert_id, donors_in_radius, donors_notified, ai_ranking_used)
		VALUES (gen_random_uuid(), $1, $2, $3, $4)
		ON CONFLICT (alert_id) DO UPDATE
		SET donors_in_radius=$2, donors_notified=$3, ai_ranking_used=$4, updated_at=NOW()`,
		alertID, matchedCount, notifiedCount, aiUsed,
	)

	alert := models.Alert{
		ID: alertID, HospitalID: hospitalID,
		BloodType: bloodType, QuantityUnits: quantityUnits,
		VideoURL: videoURL, Status: models.AlertStatusActive,
		Latitude: lat, Longitude: lng, MatchedDonors: matchedCount,
	}
	return utils.CreatedResponse(c, alert)
}

// GET /api/v1/hospitals/stats
func (h *HospitalHandler) Stats(c *fiber.Ctx) error {
	hospitalID := auth.GetUserID(c)

	var alertsThisMonth, activeAlerts int
	_ = database.DB.QueryRow(`
		SELECT COUNT(*)
		FROM alerts
		WHERE hospital_id = $1
		  AND created_at >= date_trunc('month', now())`, hospitalID,
	).Scan(&alertsThisMonth)
	_ = database.DB.QueryRow(
		"SELECT COUNT(*) FROM alerts WHERE hospital_id = $1 AND status = 'active'", hospitalID,
	).Scan(&activeAlerts)

	var donorsInRadius, donorsNotified, donorsResponded, donorsArrived int
	_ = database.DB.QueryRow(`
		SELECT
			COALESCE(SUM(il.donors_in_radius), 0),
			COALESCE(SUM(il.donors_notified), 0),
			COALESCE(SUM(il.donors_responded), 0),
			COALESCE(SUM(il.donors_arrived), 0)
		FROM impact_logs il
		JOIN alerts a ON a.id = il.alert_id
		WHERE a.hospital_id = $1`, hospitalID,
	).Scan(&donorsInRadius, &donorsNotified, &donorsResponded, &donorsArrived)

	type SeriesRow struct {
		Day       string `json:"day"`
		Responses int    `json:"reponses"`
		Donations int    `json:"dons"`
	}
	series := []SeriesRow{}
	rows, err := database.DB.Query(`
		WITH days AS (
			SELECT generate_series(current_date - interval '6 day', current_date, interval '1 day')::date AS d
		)
		SELECT
			to_char(days.d, 'Dy') AS day,
			COALESCE(SUM(CASE WHEN ar.status IN ('en_route','completed') THEN 1 ELSE 0 END), 0) AS responses,
			COALESCE(SUM(CASE WHEN ar.status = 'completed' THEN 1 ELSE 0 END), 0) AS donations
		FROM days
		LEFT JOIN alerts a
			ON a.hospital_id = $1
			AND a.created_at::date = days.d
		LEFT JOIN alert_responses ar
			ON ar.alert_id = a.id
			AND ar.created_at::date = days.d
		GROUP BY days.d
		ORDER BY days.d ASC`, hospitalID,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var r SeriesRow
			_ = rows.Scan(&r.Day, &r.Responses, &r.Donations)
			series = append(series, r)
		}
	}
	if series == nil {
		series = []SeriesRow{}
	}

	return utils.SuccessResponse(c, fiber.Map{
		"alerts_this_month": alertsThisMonth,
		"active_alerts":     activeAlerts,
		"donors_in_radius":  donorsInRadius,
		"donors_notified":   donorsNotified,
		"donors_responded":  donorsResponded,
		"donors_arrived":    donorsArrived,
		"series":            series,
	})
}

// GET /api/v1/hospitals/alerts
func (h *HospitalHandler) MyAlerts(c *fiber.Ctx) error {
	hospitalID := auth.GetUserID(c)
	// NOTE: Some managed Postgres poolers (e.g. transaction pooling) break prepared
	// statements used by parameterized queries in certain drivers, resulting in
	// errors like "unnamed prepared statement does not exist".
	// Since hospitalID comes from a validated JWT and must be a UUID, we safely
	// inline it after parsing to avoid prepared statements for this endpoint.
	if _, err := uuid.Parse(hospitalID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid user id")
	}
	rows, err := database.DB.Query(fmt.Sprintf(`
		SELECT id, blood_type, quantity_units, video_url, status,
		       latitude, longitude, created_at, completed_at
		FROM alerts WHERE hospital_id = '%s'
		ORDER BY created_at DESC LIMIT 20`, hospitalID))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error fetching alerts: "+err.Error())
	}
	defer rows.Close()

	alerts := []models.Alert{}
	for rows.Next() {
		var a models.Alert
		var videoURL sql.NullString
		var completedAt sql.NullTime
		err := rows.Scan(&a.ID, &a.BloodType, &a.QuantityUnits, &videoURL,
			&a.Status, &a.Latitude, &a.Longitude, &a.CreatedAt, &completedAt)
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error scanning alert: "+err.Error())
		}
		
		if videoURL.Valid {
			a.VideoURL = videoURL.String
		}
		if completedAt.Valid {
			a.CompletedAt = &completedAt.Time
		}
		
		a.HospitalID = hospitalID
		alerts = append(alerts, a)
	}
	return utils.SuccessResponse(c, alerts)
}

// GET /api/v1/hospitals/alerts/:id/status
func (h *HospitalHandler) AlertStatus(c *fiber.Ctx) error {
	alertID := c.Params("id")
	hospitalID := auth.GetUserID(c)
	if _, err := uuid.Parse(alertID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid alert id")
	}
	if _, err := uuid.Parse(hospitalID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid user id")
	}

	var alert models.Alert
	var videoURL sql.NullString
	err := database.DB.QueryRow(fmt.Sprintf(`
		SELECT id, hospital_id, blood_type, quantity_units, video_url,
		       status, latitude, longitude, created_at
		FROM alerts WHERE id = '%s' AND hospital_id = '%s'`,
		alertID, hospitalID,
	)).Scan(&alert.ID, &alert.HospitalID, &alert.BloodType, &alert.QuantityUnits,
		&videoURL, &alert.Status, &alert.Latitude, &alert.Longitude, &alert.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Alert not found")
	}
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Database error: "+err.Error())
	}

	if videoURL.Valid {
		alert.VideoURL = videoURL.String
	}

	_ = database.DB.QueryRow(fmt.Sprintf(
		"SELECT COUNT(*) FROM alert_responses WHERE alert_id = '%s' AND status IN ('accepted','en_route','completed')",
		alertID,
	)).Scan(&alert.RespondingDonors)

	type ResponseRow struct {
		DonorID      string                     `json:"donor_id"`
		DonorName    string                     `json:"donor_name"`
		BloodType    models.BloodType           `json:"blood_type"`
		Status       models.DonorResponseStatus `json:"status"`
		Latitude     float64                    `json:"latitude"`
		Longitude    float64                    `json:"longitude"`
		DistanceKm   float64                    `json:"distance_km"`
		ETAMinutes   int                        `json:"eta_minutes"`
	}
	var responses []ResponseRow
	rows, _ := database.DB.Query(fmt.Sprintf(`
		SELECT
			ar.donor_id,
			u.first_name||' '||u.last_name,
			u.blood_type,
			ar.status,
			u.latitude,
			u.longitude,
			ST_DistanceSphere(
				ST_MakePoint(u.longitude, u.latitude),
				ST_MakePoint(a.longitude, a.latitude)
			) / 1000.0 AS distance_km
		FROM alert_responses ar
		JOIN users u ON u.id = ar.donor_id
		JOIN alerts a ON a.id = ar.alert_id
		WHERE ar.alert_id = '%s' AND ar.status IN ('accepted','en_route','completed')
		ORDER BY ar.updated_at ASC`, alertID))
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var r ResponseRow
			var bloodType sql.NullString
			var distanceKm sql.NullFloat64
			err := rows.Scan(&r.DonorID, &r.DonorName, &bloodType, &r.Status, &r.Latitude, &r.Longitude, &distanceKm)
			if err != nil {
				continue
			}
			// Treat legacy "accepted" as "en_route" for the hospital dashboard.
			if r.Status == models.DonorResponseAccepted {
				r.Status = models.DonorResponseEnRoute
			}
			if bloodType.Valid {
				r.BloodType = models.BloodType(bloodType.String)
			}
			if distanceKm.Valid {
				r.DistanceKm = distanceKm.Float64
			}
			// ETA model based on trip distance:
			// short trips -> slower city speed, medium -> urban roads, long -> mixed roads.
			avgSpeedKmh := 22.0
			if r.DistanceKm > 5 {
				avgSpeedKmh = 32.0
			}
			if r.DistanceKm > 15 {
				avgSpeedKmh = 45.0
			}
			// Add fixed overhead for departure/parking/access.
			baseMinutes := 4.0
			r.ETAMinutes = int(baseMinutes + ((r.DistanceKm / avgSpeedKmh) * 60.0))
			if r.Status != models.DonorResponseCompleted && r.ETAMinutes < 1 {
				r.ETAMinutes = 1
			}
			if r.Status == models.DonorResponseCompleted {
				r.ETAMinutes = 0
			}
			responses = append(responses, r)
		}
	}
	if responses == nil {
		responses = []ResponseRow{}
	}
	return utils.SuccessResponse(c, fiber.Map{"alert": alert, "responses": responses})
}

// PATCH /api/v1/hospitals/alerts/:id/complete
func (h *HospitalHandler) CompleteAlert(c *fiber.Ctx) error {
	alertID := c.Params("id")
	hospitalID := auth.GetUserID(c)
	result, err := database.DB.Exec(`
		UPDATE alerts SET status='completed', completed_at=NOW(), updated_at=NOW()
		WHERE id=$1 AND hospital_id=$2 AND status='active'`,
		alertID, hospitalID,
	)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error completing alert")
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Active alert not found")
	}
	return utils.MessageResponse(c, "Alert marked as completed")
}

// POST /api/v1/hospitals/verify-donor
func (h *HospitalHandler) VerifyDonor(c *fiber.Ctx) error {
	hospitalID := auth.GetUserID(c)
	var req models.VerifyDonorRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if req.DonorID == "" || req.AlertID == "" {
		if req.AlertID == "" {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "alert_id is required")
		}
		if req.DonorID == "" && req.ConfirmationCode == "" {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "donor_id or confirmation_code is required")
		}
	}
	if _, err := uuid.Parse(hospitalID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid user id")
	}
	if _, err := uuid.Parse(req.AlertID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid alert_id")
	}

	// Ensure the alert belongs to the authenticated hospital.
	var ownedAlert string
	err := database.DB.QueryRow(fmt.Sprintf(
		"SELECT id FROM alerts WHERE id = '%s' AND hospital_id = '%s'",
		req.AlertID, hospitalID,
	)).Scan(&ownedAlert)
	if errors.Is(err, sql.ErrNoRows) {
		return utils.ErrorResponse(c, fiber.StatusForbidden, "This alert does not belong to your hospital")
	}
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error checking alert ownership: "+err.Error())
	}

	donorID := req.DonorID
	if donorID == "" && req.ConfirmationCode != "" {
		code := strings.TrimSpace(req.ConfirmationCode)
		if len(code) < 6 || len(code) > 32 {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid confirmation_code")
		}
		code = strings.ToLower(code)
		err = database.DB.QueryRow(fmt.Sprintf(`
			SELECT donor_id
			FROM alert_responses
			WHERE alert_id = '%s'
			  AND LEFT(REPLACE(id::text, '-', ''), %d) = '%s'
			ORDER BY updated_at DESC
			LIMIT 1`,
			req.AlertID, len(code), code,
		)).Scan(&donorID)
		if errors.Is(err, sql.ErrNoRows) {
			return utils.ErrorResponse(c, fiber.StatusNotFound, "Invalid confirmation code for this alert")
		}
		if err != nil {
			return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error resolving confirmation code: "+err.Error())
		}
	}

	if _, err := uuid.Parse(donorID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid donor_id")
	}

	// Accept both accepted and en_route statuses to avoid state mismatch.
	result, err := database.DB.Exec(fmt.Sprintf(`
		UPDATE alert_responses SET status='completed', updated_at=NOW()
		WHERE donor_id='%s' AND alert_id='%s' AND status IN ('accepted','en_route')`,
		donorID, req.AlertID,
	))
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error verifying donor: "+err.Error())
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "No accepted/en-route response found for this donor/alert")
	}

	// Update donation count for the donor
	res, err := database.DB.Exec(fmt.Sprintf(`
		UPDATE users SET donation_count=donation_count+1, status='available', updated_at=NOW()
		WHERE id='%s'`, donorID,
	))
	if err != nil {
		fmt.Printf("[DEBUG] Error updating donation_count for donor %s: %v\n", donorID, err)
	} else {
		rows, _ := res.RowsAffected()
		fmt.Printf("[DEBUG] Updated donation_count for donor %s, rows affected: %d\n", donorID, rows)
	}

	_, _ = database.DB.Exec(fmt.Sprintf(`
		UPDATE impact_logs
		SET donors_arrived = donors_arrived + 1, updated_at = NOW()
		WHERE alert_id = '%s'`, req.AlertID,
	))
	return utils.MessageResponse(c, "Donor verified and donation recorded successfully")
}

// findNearbyDonors returns available donors within radiusMeters of (lat, lng) with compatible blood types.
func (h *HospitalHandler) findNearbyDonors(lat, lng float64, bloodTypes []models.BloodType, radiusMeters float64) ([]models.User, error) {
	if len(bloodTypes) == 0 {
		return nil, nil
	}
	placeholders := make([]string, len(bloodTypes))
	args := []interface{}{lat, lng, radiusMeters}
	for i, bt := range bloodTypes {
		placeholders[i] = fmt.Sprintf("$%d", i+4)
		args = append(args, string(bt))
	}
	query := fmt.Sprintf(`
		SELECT id, email, first_name, last_name, blood_type,
		       latitude, longitude, donation_count, fcm_token
		FROM users
		WHERE role='donor' AND status='available'
		  AND blood_type IN (%s)
		  AND ST_DWithin(
		        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
		        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
		        $3
		      )
		LIMIT 200`,
		strings.Join(placeholders, ","),
	)
	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var donors []models.User
	for rows.Next() {
		var u models.User
		_ = rows.Scan(&u.ID, &u.Email, &u.FirstName, &u.LastName,
			&u.BloodType, &u.Latitude, &u.Longitude, &u.DonationCount, &u.FCMToken)
		donors = append(donors, u)
	}
	return donors, nil
}
