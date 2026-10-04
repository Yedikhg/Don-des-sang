package database

import (
	"context"
	"database/sql"
	"net/url"
	"os"
	"testing"
	"time"
)

func TestNamedURL(t *testing.T) {
	base := "postgres://owner:p%40ss@db.internal:5432/elevage_demo_db?sslmode=require&connect_timeout=10"
	dsn, err := NamedURL(base, "urgence_sang_db")
	if err != nil {
		t.Fatal(err)
	}
	u, _ := url.Parse(dsn)
	password, _ := u.User.Password()
	if u.Path != "/urgence_sang_db" || password != "p@ss" || u.Query().Get("sslmode") != "require" || u.Query().Get("connect_timeout") != "10" {
		t.Fatal("database selection lost credentials or connection options")
	}
	for _, name := range []string{"", "bad-name", "x; DROP DATABASE postgres", "postgres", "template0"} {
		if _, err := NamedURL(base, name); err == nil {
			t.Errorf("accepted invalid database name %q", name)
		}
	}
	if _, err := NamedURL("not a postgres URL", "urgence_sang_db"); err == nil {
		t.Fatal("accepted an invalid connection URL")
	}
}

func TestInitializeSeparateDatabaseAndAlertFlow(t *testing.T) {
	base := os.Getenv("DATABASE_TEST_URL")
	if base == "" {
		t.Skip("DATABASE_TEST_URL is required for the PostGIS integration test")
	}
	u, err := url.Parse(base)
	if err != nil || (u.Hostname() != "localhost" && u.Hostname() != "127.0.0.1") {
		t.Fatal("integration tests require a local disposable Postgres instance")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	name := "urgence_sang_ci"
	dsn, err := Initialize(ctx, base, name)
	if err != nil {
		t.Fatal(err)
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	var donor, hospital, alert string
	if err := db.QueryRowContext(ctx, `INSERT INTO users (email, password_hash, role, blood_type, latitude, longitude) VALUES ('donor@example.invalid', 'test-only', 'donor', 'O-', -1.67, 29.22) RETURNING id`).Scan(&donor); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `INSERT INTO users (email, password_hash, role, latitude, longitude) VALUES ('hospital@example.invalid', 'test-only', 'hospital', -1.6701, 29.2201) RETURNING id`).Scan(&hospital); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRowContext(ctx, `INSERT INTO alerts (hospital_id, blood_type, quantity_units, latitude, longitude, expires_at) VALUES ($1, 'O+', 1, -1.6701, 29.2201, NOW() + interval '2 hours') RETURNING id`, hospital).Scan(&alert); err != nil {
		t.Fatal(err)
	}
	var count int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM alerts WHERE expires_at > NOW() AND ST_DWithin(ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography, ST_SetSRID(ST_MakePoint(29.22, -1.67), 4326)::geography, 10000)`).Scan(&count); err != nil || count != 1 {
		t.Fatalf("nearby alert query failed: count=%d err=%v", count, err)
	}
	if _, err := db.ExecContext(ctx, `INSERT INTO alert_responses (alert_id, donor_id, status) VALUES ($1, $2, 'en_route')`, alert, donor); err != nil {
		t.Fatal(err)
	}
	if _, err := Initialize(ctx, base, name); err != nil {
		t.Fatalf("repeat initialization failed: %v", err)
	}
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM users").Scan(&count); err != nil || count != 2 {
		t.Fatalf("repeat initialization changed application data: count=%d err=%v", count, err)
	}
	source, err := sql.Open("postgres", base)
	if err != nil {
		t.Fatal(err)
	}
	defer source.Close()
	var users sql.NullString
	if err := source.QueryRowContext(ctx, "SELECT to_regclass('public.users')::text").Scan(&users); err != nil || users.Valid {
		t.Fatalf("application tables leaked into source database: err=%v", err)
	}
}
