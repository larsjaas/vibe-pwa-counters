package main

import (
    "database/sql"
    "fmt"
    "log"
    "net/http"
    "os"

    _ "github.com/lib/pq"
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

    // HTTP/REST server setup
    mux := http.NewServeMux()
    mux.HandleFunc("/health", healthHandler)
    mux.HandleFunc("/api/ping", pingHandler)
    mux.HandleFunc("/api/logout", logoutHandler)
    mux.HandleFunc("/api/login", loginHandler)
    mux.HandleFunc("/api/auth/google/callback", authCallbackHandler)
    mux.HandleFunc("/api/validate-session", validateSessionHandler)
    // After logout we redirect to the landing page.
    mux.HandleFunc("/", catchAllHandler)

    fmt.Println("Listening on :8081")
    if err := http.ListenAndServe(":8081", mux); err != nil {
        panic(err)
    }
}

func pingHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/ping called: method=%s", r.Method)
    if r.Method != http.MethodGet {
        methodNotAllowed(w, r)
        return
    }
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("pong"))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/health called: method=%s", r.Method)
    if r.Method != http.MethodGet {
        methodNotAllowed(w, r)
        return
    }
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

func catchAllHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("Catch-all handler called: method=%s path=%s", r.Method, r.URL.Path)
    if r.Method != http.MethodGet {
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    _, err := r.Cookie("session")
    if err != nil {
        log.Printf("No session cookie; redirecting to /api/login")
        http.Redirect(w, r, "/api/login", http.StatusFound)
        return
    }
    // Serve the main index.html after successful authentication.
    data, err := os.ReadFile("html/index.html")
    if err != nil {
        http.Error(w, "Failed to load index.html", http.StatusInternalServerError)
        log.Printf("Failed to read index.html: %v", err)
        return
    }
    w.Header().Set("Content-Type", "text/html")
    w.Write(data)
}

func methodNotAllowed(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api method not allowed: method=%s path=%s", r.Method, r.URL.Path)
    w.WriteHeader(http.StatusBadRequest)
}
