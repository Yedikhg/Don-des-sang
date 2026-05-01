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

type FCMPayload struct {
	To           string            `json:"to"`
	Data         map[string]string `json:"data,omitempty"`
	Notification FCMNotification   `json:"notification"`
}

type FCMNotification struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Sound string `json:"sound"`
}

type FirebaseService struct {
	serverKey string
	client    *http.Client
}

func NewFirebaseService() *FirebaseService {
	return &FirebaseService{
		serverKey: config.App.FirebaseKey,
		client:    &http.Client{Timeout: 10 * time.Second},
	}
}

// SendToToken sends a push notification to a single FCM device token.
func (f *FirebaseService) SendToToken(fcmToken, title, body string, data map[string]string) error {
	if f.serverKey == "" || fcmToken == "" {
		return nil
	}
	payload := FCMPayload{
		To:   fcmToken,
		Data: data,
		Notification: FCMNotification{
			Title: title,
			Body:  body,
			Sound: "default",
		},
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost,
		"https://fcm.googleapis.com/fcm/send", bytes.NewReader(raw))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "key="+f.serverKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := f.client.Do(req)
	if err != nil {
		return fmt.Errorf("FCM request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("FCM returned status %d", resp.StatusCode)
	}
	return nil
}
