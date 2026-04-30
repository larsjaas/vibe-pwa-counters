package http

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	db "github.com/larsa/pwa-counter/backend/internal/db"
)

// TagsHandler handles requests for tag management, tagging of counters, and sharing.
// It maps to /api/tags and /api/tags/ and /api/tags/:id
func TagsHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/tags called: method=%s path=%s", r.Method, r.URL.Path)

	sess, err := AuthenticateRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID := sess.UserID

	path := r.URL.Path
	method := r.Method

	// Handle /api/tags and /api/tags/
	if path == "/api/tags" || path == "/api/tags/" {
		switch method {
		case http.MethodGet:
			handleGetTags(w, r, userID)
		case http.MethodPost:
			handleCreateTag(w, r, userID)
		default:
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Handle /api/tags/:id ...
	if strings.HasPrefix(path, "/api/tags/") {
		parts := strings.Split(strings.TrimPrefix(path, "/api/tags/"), "/")
		if len(parts) == 0 || parts[0] == "" {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		tagID, err := strconv.Atoi(parts[0])
		if err != nil {
			http.Error(w, "invalid tag ID", http.StatusBadRequest)
			return
		}

		// Case: /api/tags/:id
		if len(parts) == 1 {
			switch method {
			case http.MethodPut:
				handleUpdateTag(w, r, userID, tagID)
			case http.MethodDelete:
				handleDeleteTag(w, r, userID, tagID)
			default:
				http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		// Case: /api/tags/:id/counters
		if len(parts) == 2 && parts[1] == "counters" {
			switch method {
			case http.MethodGet:
				handleGetCountersForTag(w, r, userID, tagID)
			default:
				http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		// Case: /api/tags/:id/counters/:cid
		if len(parts) == 3 && parts[1] == "counters" {
			counterID, err := strconv.Atoi(parts[2])
			if err != nil {
				http.Error(w, "invalid counter ID", http.StatusBadRequest)
				return
			}
			switch method {
			case http.MethodPost:
				handleAddTagToCounter(w, r, userID, tagID, counterID)
			case http.MethodDelete:
				handleRemoveTagFromCounter(w, r, userID, tagID, counterID)
			default:
				http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		// Case: /api/tags/:id/shares
		if len(parts) == 2 && parts[1] == "shares" {
			switch method {
			case http.MethodGet:
				handleGetTagShares(w, r, userID, tagID)
			case http.MethodPost:
				handleShareTag(w, r, userID, tagID)
			default:
				http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		// Case: /api/tags/:id/shares/:email (or uid)
		if len(parts) == 3 && parts[1] == "shares" {
			email := parts[2]
			switch method {
			case http.MethodDelete:
				handleUnshareTag(w, r, userID, tagID, email)
			default:
				http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		http.Error(w, "Not Found", http.StatusNotFound)
	} else {
		http.Error(w, "Not Found", http.StatusNotFound)
	}
}

func handleGetTags(w http.ResponseWriter, r *http.Request, userID int) {
	tags, err := db.GetTagsForUser(userID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tags)
}

func handleCreateTag(w http.ResponseWriter, r *http.Request, userID int) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	tag, err := db.InsertTag(userID, body.Name)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tag)
}

func handleUpdateTag(w http.ResponseWriter, r *http.Request, userID int, tagID int) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	updated, err := db.UpdateTag(userID, tagID, body.Name)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if !updated {
		http.Error(w, "tag not found or unauthorized", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleDeleteTag(w http.ResponseWriter, r *http.Request, userID int, tagID int) {
	updated, err := db.SoftDeleteTag(userID, tagID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if !updated {
		http.Error(w, "tag not found or unauthorized", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleAddTagToCounter(w http.ResponseWriter, r *http.Request, userID int, tagID int, counterID int) {
	err := db.AddTagToCounter(userID, tagID, counterID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleRemoveTagFromCounter(w http.ResponseWriter, r *http.Request, userID int, tagID int, counterID int) {
	updated, err := db.RemoveTagFromCounter(userID, tagID, counterID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if !updated {
		http.Error(w, "association not found or unauthorized", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleGetCountersForTag(w http.ResponseWriter, r *http.Request, userID int, tagID int) {
	counters, err := db.GetCountersByTag(userID, tagID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	ids := make([]int, 0, len(counters))
	for _, c := range counters {
		ids = append(ids, c.ID)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(ids)
}

func handleShareTag(w http.ResponseWriter, r *http.Request, userID int, tagID int) {
	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	targetUserID, err := db.GetUserIDByEmail(body.Email)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	err = db.ShareTagWithUser(userID, tagID, targetUserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleUnshareTag(w http.ResponseWriter, r *http.Request, userID int, tagID int, email string) {
	targetUserID, err := db.GetUserIDByEmail(email)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	updated, err := db.UnshareTagFromUser(userID, tagID, targetUserID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if !updated {
		http.Error(w, "share not found or unauthorized", http.StatusNotFound)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func handleGetTagShares(w http.ResponseWriter, r *http.Request, userID int, tagID int) {
	emails, err := db.GetTagShares(userID, tagID)
	if err != nil {
		http.Error(w, "unauthorized or tag not found", http.StatusForbidden)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(emails)
}
