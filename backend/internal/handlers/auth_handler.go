package handlers

import (
	"database/sql"
	"errors"
	"fmt"

	"urgence-sang/internal/auth"
	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
	"urgence-sang/internal/models"
	"urgence-sang/internal/services"
	"urgence-sang/pkg/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	storage *services.StorageService
}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{storage: services.NewStorageService()}
}

// POST /api/v1/auth/register
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	// Check if request is multipart/form-data (for hospital with license file)
	contentType := string(c.Request().Header.ContentType())
	isMultipart := len(contentType) >= 19 && contentType[:19] == "multipart/form-data"

	var req models.RegisterRequest

	if isMultipart {
		// Parse form data
		req.Email = c.FormValue("email")
		req.Password = c.FormValue("password")
		req.Role = models.Role(c.FormValue("role"))
		req.FirstName = c.FormValue("first_name")
		req.LastName = c.FormValue("last_name")
		req.Phone = c.FormValue("phone")
		req.BloodType = models.BloodType(c.FormValue("blood_type"))
		req.HospitalName = c.FormValue("hospital_name")
		
		// Parse latitude and longitude
		if lat := c.FormValue("latitude"); lat != "" {
			fmt.Sscanf(lat, "%f", &req.Latitude)
		}
		if lng := c.FormValue("longitude"); lng != "" {
			fmt.Sscanf(lng, "%f", &req.Longitude)
		}
	} else {
		// Parse JSON body
		if err := c.BodyParser(&req); err != nil {
			return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
		}
	}

	if req.Email == "" || req.Password == "" || req.Role == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "email, password and role are required")
	}
	if req.Role != models.RoleDonor && req.Role != models.RoleHospital {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "role must be 'donor' or 'hospital'")
	}
	if req.Role == models.RoleDonor && req.BloodType == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "blood_type is required for donors")
	}

	var existingID string
	err := database.DB.QueryRow("SELECT id FROM users WHERE email = $1", req.Email).Scan(&existingID)
	if err == nil {
		return utils.ErrorResponse(c, fiber.StatusConflict, "Email already registered")
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Database error")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error processing password")
	}

	userID := uuid.New().String()
	
	// For hospitals, blood_type should be NULL
	var bloodTypeValue interface{}
	if req.Role == models.RoleDonor {
		bloodTypeValue = string(req.BloodType)
	} else {
		bloodTypeValue = nil
	}
	
	_, err = database.DB.Exec(`
		INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, blood_type, latitude, longitude, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		userID, req.Email, string(hash), string(req.Role),
		req.FirstName, req.LastName, req.Phone,
		bloodTypeValue, req.Latitude, req.Longitude,
		string(models.StatusAvailable),
	)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error creating user: "+err.Error())
	}

	if req.Role == models.RoleHospital {
		hospitalName := req.HospitalName
		if hospitalName == "" {
			hospitalName = req.FirstName + " " + req.LastName + " Hospital"
		}
		licenseURL := ""
		licenseFile, uploadErr := utils.ExtractDocumentFile(c, "license", config.App.MaxUploadSize)
		if uploadErr == nil {
			licenseURL, _ = h.storage.UploadFile(licenseFile, "licenses")
		}
		verifyID := uuid.New().String()
		_, _ = database.DB.Exec(`
			INSERT INTO hospital_verifications (id, user_id, hospital_name, license_url, is_verified)
			VALUES ($1,$2,$3,$4,false)`,
			verifyID, userID, hospitalName, licenseURL,
		)
	}

	token, err := auth.GenerateToken(userID, req.Email, req.Role)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error generating token")
	}

	user := models.User{
		ID: userID, Email: req.Email, Role: req.Role,
		FirstName: req.FirstName, LastName: req.LastName,
		Phone: req.Phone, BloodType: req.BloodType,
		Status: models.StatusAvailable,
	}
	return utils.CreatedResponse(c, models.AuthResponse{Token: token, User: user})
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "Invalid request body")
	}
	if req.Email == "" || req.Password == "" {
		return utils.ErrorResponse(c, fiber.StatusBadRequest, "email and password are required")
	}

	var user models.User
	var bloodType sql.NullString
	err := database.DB.QueryRow(`
		SELECT id, email, password_hash, role, first_name, last_name, phone, blood_type, status, donation_count
		FROM users WHERE email = $1`, req.Email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Role,
		&user.FirstName, &user.LastName, &user.Phone,
		&bloodType, &user.Status, &user.DonationCount)

	if errors.Is(err, sql.ErrNoRows) {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid credentials")
	}
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Database error: "+err.Error())
	}

	// Set blood type only if it's not NULL
	if bloodType.Valid {
		user.BloodType = models.BloodType(bloodType.String)
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid credentials")
	}

	if req.FCMToken != "" {
		_, _ = database.DB.Exec("UPDATE users SET fcm_token=$1, updated_at=NOW() WHERE id=$2", req.FCMToken, user.ID)
	}

	token, err := auth.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Error generating token")
	}
	user.PasswordHash = ""
	return utils.SuccessResponse(c, models.AuthResponse{Token: token, User: user})
}

// GET /api/v1/auth/me
func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID := auth.GetUserID(c)
	if _, err := uuid.Parse(userID); err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid user id")
	}
	var user models.User
	var bloodType sql.NullString
	// Avoid prepared statements on some DB poolers (can cause flaky pq errors).
	err := database.DB.QueryRow(fmt.Sprintf(`
		SELECT id, email, role, first_name, last_name, phone, blood_type, latitude, longitude, status, donation_count, created_at
		FROM users WHERE id = '%s'`, userID),
	).Scan(
		&user.ID, &user.Email, &user.Role, &user.FirstName, &user.LastName,
		&user.Phone, &bloodType, &user.Latitude, &user.Longitude,
		&user.Status, &user.DonationCount, &user.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "User not found")
	}
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Database error: "+err.Error())
	}
	
	// Set blood type only if it's not NULL
	if bloodType.Valid {
		user.BloodType = models.BloodType(bloodType.String)
	}
	
	return utils.SuccessResponse(c, user)
}
