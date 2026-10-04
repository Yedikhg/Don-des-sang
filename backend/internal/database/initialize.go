package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	dbschema "urgence-sang/db"

	"github.com/lib/pq"
)

var databaseNamePattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,62}$`)

// NamedURL keeps the connection credentials and TLS options while selecting
// a separate logical database on the same Postgres instance.
func NamedURL(base, name string) (string, error) {
	if !databaseNamePattern.MatchString(name) || name == "postgres" || strings.HasPrefix(name, "template") {
		return "", errors.New("invalid application database name")
	}
	u, err := url.Parse(base)
	if err != nil || (u.Scheme != "postgres" && u.Scheme != "postgresql") || u.Host == "" || u.User == nil || u.Path == "" || u.Path == "/" || u.Fragment != "" {
		return "", errors.New("DATABASE_URL must be a valid Postgres connection URL")
	}
	u.Path = "/" + name
	u.RawPath = ""
	return u.String(), nil
}

// Initialize creates the application's database if it does not yet exist and
// applies only its own idempotent schema. It never runs schema SQL in the
// source database used to reach the instance.
func Initialize(ctx context.Context, sourceURL, name string) (string, error) {
	targetURL, err := NamedURL(sourceURL, name)
	if err != nil {
		return "", err
	}
	target, err := sql.Open("postgres", targetURL)
	if err != nil {
		return "", fmt.Errorf("open application database: %w", err)
	}
	defer target.Close()
	target.SetMaxOpenConns(1)
	err = target.PingContext(ctx)
	if err != nil {
		var pgErr *pq.Error
		if !errors.As(err, &pgErr) || pgErr.Code != "3D000" {
			return "", fmt.Errorf("connect application database: %w", err)
		}
		source, openErr := sql.Open("postgres", sourceURL)
		if openErr != nil {
			return "", fmt.Errorf("open instance connection: %w", openErr)
		}
		defer source.Close()
		if _, createErr := source.ExecContext(ctx, "CREATE DATABASE "+pq.QuoteIdentifier(name)); createErr != nil {
			var duplicate *pq.Error
			if !errors.As(createErr, &duplicate) || duplicate.Code != "42P04" {
				return "", fmt.Errorf("create application database: %w", createErr)
			}
		}
		if err := target.PingContext(ctx); err != nil {
			return "", fmt.Errorf("connect new application database: %w", err)
		}
	}

	tx, err := target.BeginTx(ctx, nil)
	if err != nil {
		return "", fmt.Errorf("begin schema initialization: %w", err)
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, "SELECT pg_advisory_xact_lock(742304)"); err != nil {
		return "", fmt.Errorf("lock schema initialization: %w", err)
	}
	if _, err := tx.ExecContext(ctx, dbschema.SQL); err != nil {
		return "", fmt.Errorf("initialize application schema: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return "", fmt.Errorf("commit application schema: %w", err)
	}
	return targetURL, nil
}
