package http

import (
	"encoding/json"
	"log"
	"net/http"

	db "github.com/larsa/pwa-counter/backend/internal/db"
)

// ListUserSettings lists all settings for the authenticated user.
func ListUserSettings(w http.ResponseWriter, r *http.Request, uid int) {
	key := r.URL.Query().Get("key")
	if key != "" {
		val, err := db.GetUserSetting(uid, key)
		if err != nil {
			log.Printf("UserSettingsHandler: GetUserSetting failed: %v", err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{key: val})
		return
	}

	settings, err := db.GetUserSettings(uid)
	if err != nil {
		log.Printf("UserSettingsHandler: GetUserSettings failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

// SetUserSetting updates or creates a setting for the authenticated user.
func SetUserSetting(w http.ResponseWriter, r *http.Request, uid int) {
	var body struct {
		Setting string `json:"setting"`
		Value   string `json:"value"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if body.Setting == "" {
		http.Error(w, "setting key required", http.StatusBadRequest)
		return
	}

	if err := db.SetUserSetting(uid, body.Setting, body.Value); err != nil {
		log.Printf("UserSettingsHandler: SetUserSetting failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// DeleteUserSetting deletes a specific setting for the authenticated user.
func DeleteUserSetting(w http.ResponseWriter, r *http.Request, uid int) {
	key := r.URL.Query().Get("key")
	if key == "" {
		http.Error(w, "key query parameter required", http.StatusBadRequest)
		return
	}

	if err := db.DeleteUserSetting(uid, key); err != nil {
		log.Printf("UserSettingsHandler: DeleteUserSetting failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
