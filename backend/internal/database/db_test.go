package database

import (
	"context"
	"testing"
)

func TestFailedConnectionDoesNotPublishDatabaseHandle(t *testing.T) {
	DB = nil
	err := Connect("postgres://127.0.0.1:1/missing?sslmode=disable&connect_timeout=1")
	if err == nil {
		t.Fatal("expected the connection to a closed local port to fail")
	}
	if DB != nil {
		_ = DB.Close()
		t.Fatal("failed connection must not be exposed as a ready database")
	}
	if Ready(context.Background()) {
		t.Fatal("a missing database must not pass its health check")
	}
}
