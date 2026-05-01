package utils

import (
	"fmt"
	"io"
	"path/filepath"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type UploadedFile struct {
	OriginalName string
	StoredName   string
	ContentType  string
	Size         int64
	Data         []byte
}

var AllowedDocTypes = map[string]bool{
	"application/pdf": true,
	"image/jpeg":      true,
	"image/png":       true,
}

var AllowedVideoTypes = map[string]bool{
	"video/mp4":       true,
	"video/webm":      true,
	"video/quicktime": true,
}

func ExtractFile(c *fiber.Ctx, fieldName string, maxSize int64, allowedTypes map[string]bool) (*UploadedFile, error) {
	fileHeader, err := c.FormFile(fieldName)
	if err != nil {
		return nil, fmt.Errorf("field '%s' is required", fieldName)
	}
	if fileHeader.Size > maxSize {
		return nil, fmt.Errorf("file too large: maximum allowed size is %d MB", maxSize/1024/1024)
	}
	contentType := fileHeader.Header.Get("Content-Type")
	if !allowedTypes[contentType] {
		return nil, fmt.Errorf("unsupported file type: %s", contentType)
	}
	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("cannot open file: %w", err)
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("cannot read file: %w", err)
	}
	ext := filepath.Ext(fileHeader.Filename)
	storedName := fmt.Sprintf("%s_%d%s", uuid.New().String(), time.Now().Unix(), ext)

	return &UploadedFile{
		OriginalName: fileHeader.Filename,
		StoredName:   storedName,
		ContentType:  contentType,
		Size:         fileHeader.Size,
		Data:         data,
	}, nil
}

func ExtractDocumentFile(c *fiber.Ctx, fieldName string, maxSize int64) (*UploadedFile, error) {
	return ExtractFile(c, fieldName, maxSize, AllowedDocTypes)
}

func ExtractVideoFile(c *fiber.Ctx, fieldName string, maxSize int64) (*UploadedFile, error) {
	return ExtractFile(c, fieldName, maxSize, AllowedVideoTypes)
}
