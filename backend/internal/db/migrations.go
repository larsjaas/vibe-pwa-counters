package db

// This package contains helper functions for managing database migrations.
// The migrations are stored in the root-level ./migrations directory
// and are executed with golang‑migrate on application startup.

import (
    "database/sql"
    "log"

    migrate "github.com/golang-migrate/migrate/v4"
    _ "github.com/golang-migrate/migrate/v4/source/file"
    "github.com/golang-migrate/migrate/v4/database/postgres"
)

// RunMigrations applies any pending migrations to the supplied database
// instance. It will log fatally if the migration fails, mimicking the
// behaviour of the original implementation found in main.go.
func RunMigrations(db *sql.DB) {
    driver, err := postgres.WithInstance(db, &postgres.Config{})
    if err != nil {
        log.Fatalf("Failed to create postgres driver for migrations: %v", err)
    }
    mig, err := migrate.NewWithDatabaseInstance(
        "file://./migrations",
        "postgres",
        driver,
    )
    if err != nil {
        log.Fatalf("Failed to initialise migrations: %v", err)
    }
    if err := mig.Up(); err != nil && err != migrate.ErrNoChange {
        log.Fatalf("Database migration failed: %v", err)
    }
}
