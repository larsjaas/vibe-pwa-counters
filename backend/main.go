package main

import (
    "database/sql"
    "fmt"
    "log"
    "net/http"
    "os"

    _ "github.com/lib/pq"
    migrate "github.com/golang-migrate/migrate/v4"
    "github.com/golang-migrate/migrate/v4/database/postgres"
    httpHandlers "github.com/larsa/pwa-counter/backend/internal/http"
    _ "github.com/golang-migrate/migrate/v4/source/file"
)

var db *sql.DB

func main() {
    // Initialize database connection. Use DATABASE_URL env var if set,
    // otherwise fall back to the default Postgres container settings.
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        // Use the default database created by Docker Compose
        dsn = "postgres://postgres:postgres@localhost:5432/counters?sslmode=disable"
    }
    var err error
    db, err = sql.Open("postgres", dsn)
    if err != nil {
        panic(err)
    }
    if err = db.Ping(); err != nil {
        panic(err)
    }

    // Run database migrations on startup. The migration source is
    // externalised in ./migrations folder next to this main.go file.
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

    // HTTP/REST server setup
    mux := http.NewServeMux()
    mux.HandleFunc("/health", httpHandlers.HealthHandler)
    mux.HandleFunc("/api/ping", httpHandlers.PingHandler)
    mux.HandleFunc("/api/logout", httpHandlers.LogoutHandler)
    mux.HandleFunc("/api/login", httpHandlers.LoginHandler)
    mux.HandleFunc("/api/auth/google/callback", httpHandlers.AuthCallbackHandler)
    mux.HandleFunc("/api/validate-session", httpHandlers.ValidateSessionHandler)
    // After logout we redirect to the landing page.
    mux.HandleFunc("/", httpHandlers.CatchAllHandler)

    fmt.Println("Listening on :8081")
    if err := http.ListenAndServe(":8081", mux); err != nil {
        panic(err)
    }
}

// These original handler implementations have been moved to the
// internal `http` package (see `backend/internal/http/handlers.go`).
// Keeping them out of `main.go` makes the server wiring easier to read.
