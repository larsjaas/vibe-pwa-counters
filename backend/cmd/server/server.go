package main

import (
    "database/sql"
    "fmt"
    "net/http"
    "os"

    _ "github.com/lib/pq"
    "github.com/larsa/pwa-counter/backend/internal/db"
    httpHandlers "github.com/larsa/pwa-counter/backend/internal/http"
)

var dbConn *sql.DB

func main() {
    // Initialize database connection. Use DATABASE_URL env var if set,
    // otherwise fall back to the default Postgres container settings.
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        dsn = "postgres://postgres:postgres@localhost:5432/counters?sslmode=disable"
    }

    var err error
    dbConn, err = sql.Open("postgres", dsn)
    if err != nil {
        panic(err)
    }
    if err = dbConn.Ping(); err != nil {
        panic(err)
    }

    // Register the database handle with the internal db package so that
    // other packages can use it.
    db.SetDB(dbConn)

    // Run database migrations on startup. Delegated to the internal
    // database package for better separation of concerns.
    db.RunMigrations(dbConn)

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
