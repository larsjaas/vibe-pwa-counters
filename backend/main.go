package main

import (
    "database/sql"
    "fmt"
    "net/http"
    "os"

    _ "github.com/lib/pq"
)

// db holds the global database connection pool.
var db *sql.DB

func main() {
    // Initialize database connection. Use DATABASE_URL env var if set,
    // otherwise fall back to the default Postgres container settings.
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        // Default connection string for docker-compose service.
        dsn = "postgres://postgres:postgres@localhost:5432/app?sslmode=disable"
    }
    var err error
    db, err = sql.Open("postgres", dsn)
    if err != nil {
        panic(err)
    }
    // Verify connection.
    if err = db.Ping(); err != nil {
        panic(err)
    }

    // HTTP/REST server:
    mux := http.NewServeMux()
    // Health check endpoint.
    mux.HandleFunc("/health", healthHandler)
    // Ping endpoint used for quick connectivity tests.
    mux.HandleFunc("/api/ping", pingHandler)

    // Catch-all handler for other routes
    mux.HandleFunc("/", catchAllHandler)

    fmt.Println("Listening on :8081")
    if err := http.ListenAndServe(":8081", mux); err != nil {
        panic(err)
    }
}

func pingHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        methodNotAllowed(w, r)
        return
    }
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("pong"))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        methodNotAllowed(w, r)
        return
    }
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

func catchAllHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    // For GET requests to paths other than /health, return 404
    w.WriteHeader(http.StatusNotFound)
}

func methodNotAllowed(w http.ResponseWriter, r *http.Request) {
    // For methods other than GET, respond with 400 Bad Request
    w.WriteHeader(http.StatusBadRequest)
}
