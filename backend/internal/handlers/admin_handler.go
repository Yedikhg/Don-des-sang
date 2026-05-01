package handlers

import (
	"urgence-sang/internal/auth"
	"urgence-sang/internal/database"
	"urgence-sang/internal/models"
	"urgence-sang/pkg/utils"

	"github.com/gofiber/fiber/v2"
)

type AdminHandler struct{}

func NewAdminHandler() *AdminHandler { return &AdminHandler{} }

// GET /api/v1/admin/pending-hospitals
func (h *AdminHandler) PendingHospitals(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT hv.id, hv.user_id, hv.hospital_name, hv.license_url, hv.created_at,
		       u.email, u.first_name, u.last_name, u.phone
		FROM hospital_verifications hv
		JOIN users u ON u.id = hv.user_id
		WHERE hv.is_verified = false
		ORDER BY hv.created_at ASC`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}
	defer rows.Close()

	type Row struct {
		ID           string `json:"id"`
		UserID       string `json:"user_id"`
		HospitalName string `json:"hospital_name"`
		LicenseURL   string `json:"license_url"`
		CreatedAt    string `json:"created_at"`
		Email        string `json:"email"`
		FirstName    string `json:"first_name"`
		LastName     string `json:"last_name"`
		Phone        string `json:"phone"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.UserID, &r.HospitalName, &r.LicenseURL, &r.CreatedAt,
			&r.Email, &r.FirstName, &r.LastName, &r.Phone); err != nil {
			continue
		}
		list = append(list, r)
	}
	return utils.SuccessResponse(c, list)
}

// PATCH /api/v1/admin/verify-hospital/:id
func (h *AdminHandler) VerifyHospital(c *fiber.Ctx) error {
	verifyID := c.Params("id")
	adminID := auth.GetUserID(c)
	result, err := database.DB.Exec(`
		UPDATE hospital_verifications
		SET is_verified=true, verified_at=NOW(), verified_by_admin=$1
		WHERE id=$2 AND is_verified=false`,
		adminID, verifyID,
	)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "Record not found or already verified")
	}
	return utils.MessageResponse(c, "Hospital verified successfully")
}

// GET /api/v1/admin/stats
func (h *AdminHandler) Stats(c *fiber.Ctx) error {
	var donors, hospitals, totalAlerts, completed, donations int
	var totalNotified, totalArrived, availableDonors int
	_ = database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE role='donor'").Scan(&donors)
	_ = database.DB.QueryRow("SELECT COUNT(*) FROM users WHERE role='donor' AND status='available'").Scan(&availableDonors)
	_ = database.DB.QueryRow("SELECT COUNT(*) FROM hospital_verifications WHERE is_verified=true").Scan(&hospitals)
	_ = database.DB.QueryRow("SELECT COUNT(*) FROM alerts").Scan(&totalAlerts)
	_ = database.DB.QueryRow("SELECT COUNT(*) FROM alerts WHERE status='completed'").Scan(&completed)
	_ = database.DB.QueryRow("SELECT COALESCE(SUM(donation_count),0) FROM users WHERE role='donor'").Scan(&donations)
	_ = database.DB.QueryRow("SELECT COALESCE(SUM(donors_notified),0) FROM impact_logs").Scan(&totalNotified)
	_ = database.DB.QueryRow("SELECT COALESCE(SUM(donors_arrived),0) FROM impact_logs").Scan(&totalArrived)
	return utils.SuccessResponse(c, fiber.Map{
		"total_donors":       donors,
		"available_donors":   availableDonors,
		"verified_hospitals": hospitals,
		"total_alerts":       totalAlerts,
		"completed_alerts":   completed,
		"total_donations":    donations,
		"total_notified":     totalNotified,
		"total_arrived":      totalArrived,
	})
}

// GET /api/v1/admin/impact
func (h *AdminHandler) ImpactReport(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT
			a.id, a.blood_type, a.created_at,
			COALESCE(hv.hospital_name, u.first_name||' '||u.last_name) AS hospital_name,
			COALESCE(il.donors_in_radius, 0),
			COALESCE(il.donors_notified, 0),
			COALESCE(il.donors_responded, 0),
			COALESCE(il.donors_arrived, 0),
			COALESCE(il.ai_ranking_used, false),
			ROUND(
				CASE WHEN COALESCE(il.donors_notified,0) > 0
				     THEN (COALESCE(il.donors_arrived,0)::numeric / il.donors_notified) * 100
				     ELSE 0 END, 1
			) AS conversion_rate
		FROM alerts a
		JOIN users u ON u.id = a.hospital_id
		LEFT JOIN hospital_verifications hv ON hv.user_id = a.hospital_id
		LEFT JOIN impact_logs il ON il.alert_id = a.id
		ORDER BY a.created_at DESC LIMIT 50`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}
	defer rows.Close()

	list := []models.ImpactReport{}
	for rows.Next() {
		var r models.ImpactReport
		if err := rows.Scan(
			&r.AlertID, &r.BloodType, &r.CreatedAt, &r.HospitalName,
			&r.DonorsInRadius, &r.DonorsNotified, &r.DonorsResponded,
			&r.DonorsArrived, &r.AIRankingUsed, &r.ConversionRate,
		); err != nil {
			continue
		}
		list = append(list, r)
	}
	return utils.SuccessResponse(c, list)
}

// GET /api/v1/admin/alerts
func (h *AdminHandler) AllAlerts(c *fiber.Ctx) error {
	rows, err := database.DB.Query(`
		SELECT a.id, a.blood_type, a.quantity_units, a.status, a.created_at,
		       COALESCE(hv.hospital_name, u.first_name||' '||u.last_name) AS hospital_name
		FROM alerts a
		JOIN users u ON u.id = a.hospital_id
		LEFT JOIN hospital_verifications hv ON hv.user_id = a.hospital_id
		ORDER BY a.created_at DESC LIMIT 50`)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}
	defer rows.Close()

	type Row struct {
		ID           string `json:"id"`
		BloodType    string `json:"blood_type"`
		Quantity     int    `json:"quantity_units"`
		Status       string `json:"status"`
		CreatedAt    string `json:"created_at"`
		HospitalName string `json:"hospital_name"`
	}
	list := []Row{}
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.ID, &r.BloodType, &r.Quantity, &r.Status, &r.CreatedAt, &r.HospitalName); err != nil {
			continue
		}
		list = append(list, r)
	}
	return utils.SuccessResponse(c, list)
}
