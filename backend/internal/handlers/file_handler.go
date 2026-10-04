package handlers

import (
	"bytes"
	"database/sql"
	"errors"
	"net/http"
	"time"

	"urgence-sang/internal/auth"
	"urgence-sang/internal/database"
	"urgence-sang/internal/models"
	"urgence-sang/pkg/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
)

type FileHandler struct{}

func NewFileHandler() *FileHandler { return &FileHandler{} }

func (h *FileHandler) Video(c *fiber.Ctx) error { return h.serve(c, "alert-videos") }
func (h *FileHandler) License(c *fiber.Ctx) error { return h.serve(c, "licenses") }

func (h *FileHandler) serve(c *fiber.Ctx, bucket string) error {
	var ownerID, contentType string
	var data []byte
	err := database.DB.QueryRow(`SELECT owner_id, content_type, data FROM uploaded_files WHERE bucket = $1 AND stored_name = $2`, bucket, c.Params("name")).Scan(&ownerID, &contentType, &data)
	if errors.Is(err, sql.ErrNoRows) {
		return utils.ErrorResponse(c, fiber.StatusNotFound, "File not found")
	}
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusInternalServerError, "Unable to read the file")
	}
	if bucket == "licenses" {
		if auth.GetUserID(c) != ownerID && auth.GetRole(c) != models.RoleAdmin {
			return utils.ErrorResponse(c, fiber.StatusForbidden, "This document belongs to another account")
		}
	}
	return adaptor.HTTPHandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if bucket == "licenses" {
			w.Header().Set("Cache-Control", "private, no-store")
			w.Header().Set("Content-Disposition", "attachment")
		} else {
			w.Header().Set("Cache-Control", "public, max-age=3600")
		}
		w.Header().Set("Content-Type", contentType)
		w.Header().Set("X-Content-Type-Options", "nosniff")
		http.ServeContent(w, r, c.Params("name"), time.Time{}, bytes.NewReader(data))
	})(c)
}
