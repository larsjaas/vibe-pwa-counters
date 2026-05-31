package http

import (
	"encoding/json"
	"log"
	"net/http"
)

// RoutesDiscoveryHandler returns a JSON list of available API routes.
func RoutesDiscoveryHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var info []map[string]any
	for _, route := range apiRoutes {
		info = append(info, map[string]any{
			"method":      route.Method,
			"path":        route.Path,
			"description": route.Description,
			"auth":        route.Auth,
		})
	}
	if err := json.NewEncoder(w).Encode(info); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
	}
}

// MethodNotAllowed handles unsupported methods for the API.
func MethodNotAllowed(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api method not allowed: method=%s path=%s", r.Method, r.URL.Path)
	w.WriteHeader(http.StatusBadRequest)
}
