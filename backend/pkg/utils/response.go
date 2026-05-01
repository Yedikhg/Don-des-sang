package utils

import "github.com/gofiber/fiber/v2"

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func SuccessResponse(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusOK).JSON(APIResponse{Success: true, Data: data})
}

func CreatedResponse(c *fiber.Ctx, data interface{}) error {
	return c.Status(fiber.StatusCreated).JSON(APIResponse{Success: true, Data: data})
}

func MessageResponse(c *fiber.Ctx, message string) error {
	return c.Status(fiber.StatusOK).JSON(APIResponse{Success: true, Message: message})
}

func ErrorResponse(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(APIResponse{Success: false, Error: message})
}
