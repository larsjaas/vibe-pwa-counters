package http

import (
    "log"
    "net/http"
    "os"
)

// BackendVersion is the current version of the API.
const BackendVersion = "0.8.0"

// HealthHandler responds to GET /health requests.
func HealthHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/health called: method=%s", r.Method)
    if r.Method != http.MethodGet {
        MethodNotAllowed(w, r)
        return
    }
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

// PingHandler responds to GET /api/ping requests.
func PingHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/ping called: method=%s", r.Method)
    if r.Method != http.MethodGet {
        MethodNotAllowed(w, r)
        return
    }
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("pong"))
}

// InfoHandler responds to GET /api/info requests.
func InfoHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/info called: method=%s", r.Method)
    if r.Method != http.MethodGet {
        MethodNotAllowed(w, r)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte(`{"version":"` + BackendVersion + `"}`))
}

// CatchAllHandler serves the main index.html for authenticated users.
func CatchAllHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("Catch‑all handler called: method=%s path=%s", r.Method, r.URL.Path)
    if r.Method != http.MethodGet {
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    _, err := r.Cookie("session_id")
    if err != nil {
        log.Printf("No session cookie; redirecting to /api/login")
        http.Redirect(w, r, "/api/login", http.StatusFound)
        return
    }
    data, err := os.ReadFile("html/index.html")
    if err != nil {
        http.Error(w, "Failed to load index.html", http.StatusInternalServerError)
        log.Printf("Failed to read index.html: %v", err)
        return
    }
    w.Header().Set("Content-Type", "text/html")
    w.Write(data)
}

// MethodNotAllowed handles unsupported methods for the API.
func MethodNotAllowed(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api method not allowed: method=%s path=%s", r.Method, r.URL.Path)
    w.WriteHeader(http.StatusBadRequest)
}
