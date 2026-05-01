package services

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"time"

	"urgence-sang/internal/config"
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

func (s *StorageService) UploadFile(file *utils.UploadedFile, bucket string) (string, error) {
	if s.supabaseURL == "" {
		return fmt.Sprintf("https://mock-storage.local/%s/%s", bucket, file.StoredName), nil
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
