package http

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	db "github.com/larsa/pwa-counter/backend/internal/db"
)

// ListCounts returns all count records for counters owned by the authenticated user.
func ListCounts(w http.ResponseWriter, r *http.Request, userID int) {
	counts, err := db.GetCountsForUser(userID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	type countResponse struct {
		ID        int           `json:"id"`
		CounterID int           `json:"counter"`
		UserEmail string        `json:"user_email"`
		Delta     int           `json:"delta"`
		Operation string        `json:"operation"`
		When      time.Time     `json:"when"`
		DeleteTime interface{} `json:"deletetime"`
	}

	resp := make([]countResponse, 0, len(counts))
	for _, c := range counts {
		user, err := db.GetUserByID(c.UserID)
		email := "unknown"
		if err == nil {
			email = user.Email
		}
		resp = append(resp, countResponse{
			ID:        c.ID,
			CounterID: c.CounterID,
			UserEmail: email,
			Delta:     c.Delta,
			Operation: c.Operation,
			When:      c.When,
			DeleteTime: c.DeleteTime,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("JSON encode failed: %v", err)
	}
}

// CreateCount inserts a new record into the `counts` table.
func CreateCount(w http.ResponseWriter, r *http.Request, userID int) {
	var payload struct {
		Counter   int    `json:"counter"`
		Delta     int    `json:"delta"`
		Operation string `json:"operation"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// Validate counter edit permission.
	canEdit, err := db.CanUserEditCounter(userID, payload.Counter)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if !canEdit {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	// Insert count.
	c, err := db.InsertCount(payload.Counter, userID, payload.Delta, payload.Operation)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	CountsTotal.Inc()
	users, err := db.GetUsersWithAccessToCounter(payload.Counter)
	if err == nil {
		for _, uid := range users {
			PublishEvent(uid, "UPDATED COUNTS")
		}
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(c); err != nil {
		log.Printf("JSON encode failed: %v", err)
		return
	}
}

// UpdateCountTimestamp updates the timestamp of a count record if the user owns it.
func UpdateCountTimestamp(w http.ResponseWriter, r *http.Request, userID int) {
	countIDStr := r.PathValue("id")
	countID, err := strconv.Atoi(countIDStr)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	var payload struct {
		When string `json:"when"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	when, err := time.Parse(time.RFC3339, payload.When)
	if err != nil {
		http.Error(w, "invalid timestamp format", http.StatusBadRequest)
		return
	}

	updated, err := db.UpdateCountTimestamp(userID, countID, when)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if updated {
		if cid, err := db.GetCounterIDForCount(countID); err == nil {
			users, err := db.GetUsersWithAccessToCounter(cid)
			if err == nil {
				for _, uid := range users {
					PublishEvent(uid, "UPDATED COUNTS")
				}
			}
		}
		w.WriteHeader(http.StatusOK)
	} else {
		http.Error(w, "not found", http.StatusNotFound)
	}
}

// DeleteCount soft deletes a count record if the user owns the counter.
func DeleteCount(w http.ResponseWriter, r *http.Request, userID int) {
	countIDStr := r.PathValue("id")
	countID, err := strconv.Atoi(countIDStr)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	updated, err := db.SoftDeleteCountForUser(userID, countID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if updated {
		CountsDeletedTotal.Inc()
		if cid, err := db.GetCounterIDForCount(countID); err == nil {
			users, err := db.GetUsersWithAccessToCounter(cid)
			if err == nil {
				for _, uid := range users {
					PublishEvent(uid, "UPDATED COUNTS")
				}
			}
		}
		w.WriteHeader(http.StatusOK)
	} else {
		http.Error(w, "not found", http.StatusNotFound)
	}
}
