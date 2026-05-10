package http

import (
	"encoding/json"
	"log"
	"net/http"

	db "github.com/larsa/pwa-counter/backend/internal/db"
)

// UserSettingsHandler manages user-specific account settings.
// GET /api/settings -> List all settings
// POST /api/settings -> Update/Set a setting
// DELETE /api/settings?key=... -> Delete a setting
func UserSettingsHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/settings called: method=%s", r.Method)

	sess, err := AuthenticateRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	uid := sess.UserID

	switch r.Method {
	case http.MethodGet:
		handleGetSettings(w, r, uid)
	case http.MethodPost:
		handlePostSettings(w, r, uid)
	case http.MethodDelete:
		handleDeleteSettings(w, r, uid)
	default:
		MethodNotAllowed(w, r)
	}
}

func handleGetSettings(w http.ResponseWriter, r *http.Request, uid int) {
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

func handlePostSettings(w http.ResponseWriter, r *http.Request, uid int) {
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

func handleDeleteSettings(w http.ResponseWriter, r *http.Request, uid int) {
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
