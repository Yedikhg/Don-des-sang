package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"urgence-sang/internal/auth"
	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
	"urgence-sang/internal/models"
	"urgence-sang/internal/services"
	"urgence-sang/pkg/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func deploymentDB(t *testing.T) {
	t.Helper()
	base := os.Getenv("DATABASE_TEST_URL")
	if base == "" {
		t.Skip("DATABASE_TEST_URL is required for integration tests")
	}
	u, err := url.Parse(base)
	if err != nil || (u.Hostname() != "localhost" && u.Hostname() != "127.0.0.1") {
		t.Fatal("tests require a local disposable database")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	dsn, err := database.Initialize(ctx, base, "urgence_sang_handlers_ci")
	if err != nil {
		t.Fatal(err)
	}
	if err := database.Connect(dsn); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { database.DB.Close(); database.DB = nil })
	config.App = &config.Config{JWTSecret: "test-only-signing-key", JWTExpiration: 1, MaxUploadSize: 1024 * 1024}
	t.Setenv("PUBLIC_API_URL", "https://api.example.invalid")
}

func deploymentUser(t *testing.T, role string) string {
	t.Helper()
	var id string
	err := database.DB.QueryRow(`INSERT INTO users (email, password_hash, role) VALUES ($1, 'test-only', $2) RETURNING id`, uuid.New().String()+"@example.invalid", role).Scan(&id)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func deploymentToken(t *testing.T, id string) string {
	t.Helper()
	token, err := auth.GenerateToken(id, "test@example.invalid", models.RoleHospital)
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func TestPersistentFilesAndDocumentAccess(t *testing.T) {
	deploymentDB(t)
	owner := deploymentUser(t, "hospital")
	other := deploymentUser(t, "hospital")
	storage := services.NewStorageService()
	document := []byte("%PDF-1.4\nTEST DOCUMENT ONLY\n")
	path, err := storage.UploadFile(&utils.UploadedFile{StoredName: "license.pdf", ContentType: "application/pdf", Data: document}, "licenses", owner)
	if err != nil || path != "https://api.example.invalid/api/v1/files/licenses/license.pdf" {
		t.Fatalf("persistent upload failed: %v", err)
	}
	video := []byte("example-video-bytes")
	if _, err := storage.UploadFile(&utils.UploadedFile{StoredName: "video.webm", ContentType: "video/webm", Data: video}, "alert-videos", owner); err != nil {
		t.Fatal(err)
	}
	app := fiber.New()
	h := NewFileHandler()
	app.Get("/api/v1/files/licenses/:name", auth.RequireAuth, h.License)
	app.Get("/api/v1/files/alert-videos/:name", h.Video)
	for _, tc := range []struct { token string; status int }{
		{"", http.StatusUnauthorized},
		{deploymentToken(t, other), http.StatusForbidden},
		{deploymentToken(t, owner), http.StatusOK},
	} {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/files/licenses/license.pdf", nil)
		if tc.token != "" { req.Header.Set("Authorization", "Bearer "+tc.token) }
		res, err := app.Test(req)
		if err != nil { t.Fatal(err) }
		data, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != tc.status { t.Fatalf("document access returned %d, want %d", res.StatusCode, tc.status) }
		if tc.status == http.StatusOK && (!bytes.Equal(data, document) || res.Header.Get("Cache-Control") != "private, no-store") { t.Fatal("stored document content or privacy headers were lost") }
	}
	req := httptest.NewRequest(http.MethodGet, "/api/v1/files/alert-videos/video.webm", nil)
	req.Header.Set("Range", "bytes=0-3")
	res, err := app.Test(req)
	if err != nil { t.Fatal(err) }
	data, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != http.StatusPartialContent || !bytes.Equal(data, video[:4]) { t.Fatalf("video byte-range playback failed: status=%d", res.StatusCode) }
}

func TestConfirmationCodeIsDataAndDonationIsCountedOnce(t *testing.T) {
	deploymentDB(t)
	hospital := deploymentUser(t, "hospital")
	donor := deploymentUser(t, "donor")
	var alert, response string
	if err := database.DB.QueryRow(`INSERT INTO alerts (hospital_id, blood_type) VALUES ($1, 'O+') RETURNING id`, hospital).Scan(&alert); err != nil { t.Fatal(err) }
	if err := database.DB.QueryRow(`INSERT INTO alert_responses (alert_id, donor_id, status) VALUES ($1, $2, 'en_route') RETURNING id`, alert, donor).Scan(&response); err != nil { t.Fatal(err) }
	app := fiber.New()
	app.Post("/verify", auth.RequireAuth, NewHospitalHandler().VerifyDonor)
	token := deploymentToken(t, hospital)
	code := strings.ToUpper(strings.ReplaceAll(response, "-", "")[:8])
	for _, tc := range []struct { code string; status int }{
		{"x' OR true --", http.StatusNotFound},
		{code, http.StatusOK},
		{code, http.StatusNotFound},
	} {
		body, _ := json.Marshal(map[string]string{"alert_id": alert, "confirmation_code": tc.code})
		req := httptest.NewRequest(http.MethodPost, "/verify", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+token)
		res, err := app.Test(req)
		if err != nil { t.Fatal(err) }
		res.Body.Close()
		if res.StatusCode != tc.status { t.Fatalf("verification returned %d, want %d", res.StatusCode, tc.status) }
	}
	var count int
	if err := database.DB.QueryRow("SELECT donation_count FROM users WHERE id = $1", donor).Scan(&count); err != nil || count != 1 { t.Fatalf("donation count=%d err=%v", count, err) }
}
