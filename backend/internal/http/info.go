package http

import (
	"log"
	"net/http"

	"github.com/larsa/pwa-counter/backend/internal/version"
)

// HealthHandler responds to GET /health requests.
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/health called: method=%s", r.Method)
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}

// PingHandler responds to GET /api/ping requests.
func PingHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/ping called: method=%s", r.Method)
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("pong"))
}

// InfoHandler responds to GET /api/info requests.
func InfoHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/info called: method=%s", r.Method)
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"version":"` + version.BackendVersion + `"}`))
}
