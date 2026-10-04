package services

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
	"urgence-sang/pkg/utils"
)

type StorageService struct {
	supabaseURL string
	supabaseKey string
	client      *http.Client
}

func NewStorageService() *StorageService {
	return &StorageService{
		supabaseURL: config.App.SupabaseURL,
		supabaseKey: config.App.SupabaseKey,
		client:      &http.Client{Timeout: 30 * time.Second},
	}
}

func (s *StorageService) UploadFile(file *utils.UploadedFile, bucket, ownerID string) (string, error) {
	if s.supabaseURL == "" {
		base := strings.TrimRight(os.Getenv("PUBLIC_API_URL"), "/")
		if base == "" || database.DB == nil {
			return "", fmt.Errorf("persistent file storage is not configured")
		}
		if bucket != "licenses" && bucket != "alert-videos" {
			return "", fmt.Errorf("invalid file bucket")
		}
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		_, err := database.DB.ExecContext(ctx, `
			INSERT INTO uploaded_files (owner_id, bucket, stored_name, content_type, data)
			VALUES ($1, $2, $3, $4, $5)`, ownerID, bucket, file.StoredName, file.ContentType, file.Data)
		if err != nil {
			return "", fmt.Errorf("persisting uploaded file: %w", err)
		}
		return base + "/api/v1/files/" + bucket + "/" + url.PathEscape(file.StoredName), nil
	}
	uploadURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.supabaseURL, bucket, file.StoredName)
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, uploadURL, bytes.NewReader(file.Data))
	if err != nil {
		return "", fmt.Errorf("creating upload request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+s.supabaseKey)
	req.Header.Set("Content-Type", file.ContentType)
	resp, err := s.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("uploading file: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("storage upload failed with status %d", resp.StatusCode)
	}
	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.supabaseURL, bucket, file.StoredName), nil
}
