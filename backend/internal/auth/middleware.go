package auth

import (
	"strings"

	"urgence-sang/internal/models"
	"urgence-sang/pkg/utils"

	"github.com/gofiber/fiber/v2"
)

// RequireAuth validates the Bearer JWT and injects claims into context locals.
func RequireAuth(c *fiber.Ctx) error {
	header := c.Get("Authorization")
	if header == "" {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Missing Authorization header")
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid Authorization format — expected: Bearer <token>")
	}
	claims, err := ValidateToken(parts[1])
	if err != nil {
		return utils.ErrorResponse(c, fiber.StatusUnauthorized, "Invalid or expired token")
	}
	c.Locals("user_id", claims.UserID)
	c.Locals("email", claims.Email)
	c.Locals("role", claims.Role)
	return c.Next()
}

// RequireRole restricts access to users with one of the allowed roles.
func RequireRole(roles ...models.Role) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, ok := c.Locals("role").(models.Role)
		if !ok {
			return utils.ErrorResponse(c, fiber.StatusForbidden, "Forbidden")
		}
		for _, r := range roles {
			if userRole == r {
				return c.Next()
			}
		}
		return utils.ErrorResponse(c, fiber.StatusForbidden, "Insufficient permissions for this resource")
	}
}

// GetUserID extracts the authenticated user's ID from context.
func GetUserID(c *fiber.Ctx) string {
	id, _ := c.Locals("user_id").(string)
	return id
}

// GetRole extracts the authenticated user's role from context.
func GetRole(c *fiber.Ctx) models.Role {
	role, _ := c.Locals("role").(models.Role)
	return role
}
