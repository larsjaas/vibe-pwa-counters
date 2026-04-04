package http

import (
    "fmt"
    "net/http"
)

// NewRouter instantiates a new ServeMux and registers all
// routes used by the REST backend.  It centralises route wiring so
// that the main server bootstrap remains lightweight.
func NewRouter() http.Handler {
    mux := http.NewServeMux()
    // Health and simple endpoint helpers
    mux.HandleFunc("/health", HealthHandler)
    mux.HandleFunc("/api/ping", PingHandler)

    // Authentication – login, logout and callbacks
    mux.HandleFunc("/api/logout", LogoutHandler)
    mux.HandleFunc("/api/login", LoginHandler)
    mux.HandleFunc("/api/auth/google/callback", AuthCallbackHandler)
    mux.HandleFunc("/api/validate-session", ValidateSessionHandler)

    // Register counters CRUD handler. The trailing slash variant ensures
    // DELETE /api/counters/:id works.
    mux.HandleFunc("/api/counters", CountersHandler)
    mux.HandleFunc("/api/counters/", CountersHandler)

    // Catch‑all for authenticated app entry point
    mux.HandleFunc("/", CatchAllHandler)

    // New endpoint for account info
    mux.HandleFunc("/api/account", AccountHandler)

    fmt.Println("HTTP routes registered – listening on :8081")
    return mux
}
