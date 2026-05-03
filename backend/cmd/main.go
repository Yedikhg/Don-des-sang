package main

import (
	"log"

	"urgence-sang/internal/auth"
	"urgence-sang/internal/config"
	"urgence-sang/internal/database"
	"urgence-sang/internal/handlers"
	"urgence-sang/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	config.Load()

	if config.App.DatabaseURL != "" {
		if err := database.Connect(config.App.DatabaseURL); err != nil {
			log.Printf("⚠️  Database not connected: %v", err)
		}
	} else {
		log.Println("⚠️  DATABASE_URL not set — running without database (set it in .env)")
	}

	app := fiber.New(fiber.Config{
		AppName:      "Urgence-Sang API v1",
		ErrorHandler: customErrorHandler,
		BodyLimit:    20 * 1024 * 1024,
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} ${method} ${path} ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "https://blood-emergency-azure.vercel.app,http://localhost:5173,http://localhost:5174,http://localhost:8080,http://localhost:3000",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		dbStatus := "connected"
		if database.DB == nil {
			dbStatus = "not connected (set DATABASE_URL in .env)"
		}
		return c.JSON(fiber.Map{
			"status":   "ok",
			"service":  "urgence-sang-api",
			"version":  "1.0.0",
			"database": dbStatus,
		})
	})

	// Guard: return 503 on all /api routes if DB is not connected
	api := app.Group("/api/v1", func(c *fiber.Ctx) error {
		if database.DB == nil {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"success": false,
				"error":   "Database not connected. Configure DATABASE_URL in your .env file.",
			})
		}
		return c.Next()
	})
	registerRoutes(api)

	log.Printf("🩸 Urgence-Sang API running on port %s", config.App.Port)
	log.Fatal(app.Listen(":" + config.App.Port))
}

func registerRoutes(api fiber.Router) {
	authH := handlers.NewAuthHandler()
	hospH := handlers.NewHospitalHandler()
	donorH := handlers.NewDonorHandler()
	adminH := handlers.NewAdminHandler()

	// ── Auth (public) ─────────────────────────────────────────────────────────
	a := api.Group("/auth")
	a.Post("/register", authH.Register)
	a.Post("/login", authH.Login)
	a.Get("/me", auth.RequireAuth, authH.Me)

	// ── Hospitals (hospital role required) ────────────────────────────────────
	h := api.Group("/hospitals", auth.RequireAuth, auth.RequireRole(models.RoleHospital))
	h.Post("/alerts", hospH.CreateAlert)
	h.Get("/stats", hospH.Stats)
	h.Get("/alerts", hospH.MyAlerts)
	h.Get("/alerts/:id/status", hospH.AlertStatus)
	h.Patch("/alerts/:id/complete", hospH.CompleteAlert)
	h.Post("/verify-donor", hospH.VerifyDonor)

	// ── Donors (donor role required) ──────────────────────────────────────────
	d := api.Group("/donors", auth.RequireAuth, auth.RequireRole(models.RoleDonor))
	d.Get("/nearby-alerts", donorH.NearbyAlerts)
	d.Get("/alerts/:id", donorH.GetAlert)
	d.Patch("/status", donorH.UpdateStatus)
	d.Patch("/location", donorH.UpdateLocation)
	d.Post("/respond", donorH.RespondToAlert)
	d.Get("/history", donorH.History)
	d.Get("/stats", donorH.Stats)

	// ── Admin (admin role required) ───────────────────────────────────────────
	adm := api.Group("/admin", auth.RequireAuth, auth.RequireRole(models.RoleAdmin))
	adm.Get("/pending-hospitals", adminH.PendingHospitals)
	adm.Patch("/verify-hospital/:id", adminH.VerifyHospital)
	adm.Get("/stats", adminH.Stats)
	adm.Get("/alerts", adminH.AllAlerts)
	adm.Get("/impact", adminH.ImpactReport)
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	log.Printf("SERVER ERROR [%s]: %v", c.Path(), err)
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   err.Error(),
	})
}
