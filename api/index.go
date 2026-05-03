package handler

import (
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/adaptor"

	"urgence-sang/backend/internal/auth"
	"urgence-sang/backend/internal/config"
	"urgence-sang/backend/internal/database"
	"urgence-sang/backend/internal/handlers"
	"urgence-sang/backend/internal/models"
)

var app *fiber.App

func init() {
	config.Load()

	if config.App.DatabaseURL != "" {
		database.Connect(config.App.DatabaseURL)
	}

	app = fiber.New(fiber.Config{
		AppName:      "Urgence-Sang API v1",
		ErrorHandler: customErrorHandler,
		BodyLimit:    20 * 1024 * 1024,
	})

	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "https://blood-emergency-azure.vercel.app,http://localhost:5173,http://localhost:5174,http://localhost:8080,http://localhost:3000",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		dbStatus := "connected"
		if database.DB == nil {
			dbStatus = "not connected"
		}
		return c.JSON(fiber.Map{
			"status":   "ok",
			"service":  "urgence-sang-api",
			"version":  "1.0.0",
			"database": dbStatus,
		})
	})

	api := app.Group("/api/v1", func(c *fiber.Ctx) error {
		if database.DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"success": false,
				"error":   "Database not connected",
			})
		}
		return c.Next()
	})
	registerRoutes(api)
}

// Handler - Vercel entry point
func Handler(w http.ResponseWriter, r *http.Request) {
	adaptor.FiberApp(app)(w, r)
}

func registerRoutes(api fiber.Router) {
	authH := handlers.NewAuthHandler()
	hospH := handlers.NewHospitalHandler()
	donorH := handlers.NewDonorHandler()
	adminH := handlers.NewAdminHandler()

	a := api.Group("/auth")
	a.Post("/register", authH.Register)
	a.Post("/login", authH.Login)
	a.Get("/me", auth.RequireAuth, authH.Me)

	h := api.Group("/hospitals", auth.RequireAuth, auth.RequireRole(models.RoleHospital))
	h.Post("/alerts", hospH.CreateAlert)
	h.Get("/stats", hospH.Stats)
	h.Get("/alerts", hospH.MyAlerts)
	h.Get("/alerts/:id/status", hospH.AlertStatus)
	h.Patch("/alerts/:id/complete", hospH.CompleteAlert)
	h.Post("/verify-donor", hospH.VerifyDonor)

	d := api.Group("/donors", auth.RequireAuth, auth.RequireRole(models.RoleDonor))
	d.Get("/nearby-alerts", donorH.NearbyAlerts)
	d.Get("/alerts/:id", donorH.GetAlert)
	d.Patch("/status", donorH.UpdateStatus)
	d.Patch("/location", donorH.UpdateLocation)
	d.Post("/respond", donorH.RespondToAlert)
	d.Get("/history", donorH.History)
	d.Get("/stats", donorH.Stats)

	adm := api.Group("/admin", auth.RequireAuth, auth.RequireRole(models.RoleAdmin))
	adm.Get("/pending-hospitals", adminH.PendingHospitals)
	adm.Patch("/verify-hospital/:id", adminH.VerifyHospital)
	adm.Get("/stats", adminH.Stats)
	adm.Get("/alerts", adminH.AllAlerts)
	adm.Get("/impact", adminH.ImpactReport)
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   err.Error(),
	})
}
