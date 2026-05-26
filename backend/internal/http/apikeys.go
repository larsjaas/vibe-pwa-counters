package http

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	db "github.com/larsa/pwa-counter/backend/internal/db"
)

// ListAPIKeys returns all active API keys for the authenticated user.
func ListAPIKeys(w http.ResponseWriter, r *http.Request, uid int) {
	keys, err := db.GetAPIKeysForUser(uid)
	if err != nil {
		log.Printf("ListAPIKeys: GetAPIKeysForUser failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(keys); err != nil {
		log.Printf("ListAPIKeys: JSON encode failed: %v", err)
	}
}

// CreateAPIKey generates a new API key for the authenticated user.
func CreateAPIKey(w http.ResponseWriter, r *http.Request, uid int) {
	// Generate a random API key.
	key := "key_" + strconv.Itoa(int(time.Now().UnixNano())) + "_rand"

	if err := db.CreateAPIKey(uid, key); err != nil {
		log.Printf("CreateAPIKey: CreateAPIKey failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	APIKeysTotal.Inc()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{"apikey": key}); err != nil {
		log.Printf("CreateAPIKey: JSON encode failed: %v", err)
	}
}

// DeleteAPIKey soft deletes an API key if the authenticated user owns it.
func DeleteAPIKey(w http.ResponseWriter, r *http.Request, uid int) {
	keyIDStr := r.PathValue("id")
	keyID, err := strconv.Atoi(keyIDStr)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	updated, err := db.SoftDeleteAPIKey(uid, keyID)
	if err != nil {
		log.Printf("DeleteAPIKey: SoftDeleteAPIKey failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if updated {
		APIKeysDeletedTotal.Inc()
		w.WriteHeader(http.StatusOK)
	} else {
		http.Error(w, "not found", http.StatusNotFound)
	}
}
