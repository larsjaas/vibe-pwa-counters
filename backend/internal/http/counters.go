package http

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	db "github.com/larsa/pwa-counter/backend/internal/db"
)

// CreateCounter handles POST /api/counters
func CreateCounter(w http.ResponseWriter, r *http.Request, userID int) {
	var body struct {
		Name        string  `json:"name"`
		Initial     int     `json:"initial"`
		Step        int     `json:"step"`
		Type        string  `json:"type"`
		Frequency   *int64  `json:"frequency"`
		AlertWindow *int64  `json:"alert_window"`
	}
	if e := json.NewDecoder(r.Body).Decode(&body); e != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if body.Type == "" {
		body.Type = "standard"
	}
	counter, err := db.InsertCounter(userID, body.Name, body.Step, body.Initial, body.Type, body.Frequency, body.AlertWindow)
	if err != nil {
		log.Printf("Insert counter failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	CountersTotal.Inc()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(counter); err != nil {
		log.Printf("JSON encode failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
	}
}

// ListCounters handles GET /api/counters
func ListCounters(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.URL.Query().Get("tag_id")
	var counters []*db.Counter
	var err error
	if tagIDStr != "" {
		tagID, err := strconv.Atoi(tagIDStr)
		if err != nil {
			http.Error(w, "invalid tag_id", http.StatusBadRequest)
			return
		}
		counters, err = db.GetCountersByTag(userID, tagID)
	} else {
		counters, err = db.GetCountersForUser(userID)
	}
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	type counterResponse struct {
		ID              int         `json:"id"`
		UserEmail       string      `json:"user_email"`
		Name            string      `json:"name"`
		CreateTime      time.Time   `json:"createtime"`
		ArchiveTime     interface{} `json:"archivetime"`
		DeleteTime      interface{} `json:"deletetime"`
		Step            int         `json:"step"`
		Type            string      `json:"type"`
		Frequency       *int64      `json:"frequency"`
		AlertWindow     *int64      `json:"alert_window"`
		InitialValue    int         `json:"initial_value"`
		Overdue         interface{} `json:"overdue"`
		LastPerformedAt interface{} `json:"last_performed_at"`
		PriorityScore   float64     `json:"priority_score"`
		RepeatStatus    string      `json:"repeat_status"`
	}

	resp := make([]counterResponse, 0, len(counters))
	for _, c := range counters {
		user, err := db.GetUserByID(c.UserID)
		email := "unknown"
		if err == nil {
			email = user.Email
		}
		resp = append(resp, counterResponse{
			ID:              c.ID,
			UserEmail:       email,
			Name:            c.Name,
			CreateTime:      c.CreateTime,
			ArchiveTime:     c.ArchiveTime,
			DeleteTime:      c.DeleteTime,
			Step:            c.Step,
			InitialValue:    c.InitialValue,
			Type:            c.Type,
			Frequency:       c.Frequency,
			AlertWindow:     c.AlertWindow,
			Overdue:         c.Overdue,
			LastPerformedAt: c.LastPerformedAt,
			PriorityScore:   c.PriorityScore,
			RepeatStatus:    c.RepeatStatus,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		log.Printf("JSON encode failed: %v", err)
	}
}

// UpdateCounter handles PUT/PATCH /api/counters
func UpdateCounter(w http.ResponseWriter, r *http.Request, userID int) {
	var body struct {
		ID           int     `json:"id"`
		Name         string  `json:"name"`
		Step         int     `json:"step"`
		InitialValue int     `json:"initial_value"`
		Type         string  `json:"type"`
		Frequency    *int64  `json:"frequency"`
		AlertWindow  *int64  `json:"alert_window"`
		Overdue      *int64  `json:"overdue"`
	}
	if e := json.NewDecoder(r.Body).Decode(&body); e != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	if body.Type == "" {
		body.Type = "standard"
	}
	updated, err := db.UpdateCounter(userID, body.ID, body.Name, body.Step, body.InitialValue, body.Type, body.Frequency, body.AlertWindow, body.Overdue)
	if err != nil {
		log.Printf("Update counter failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if updated {
		w.WriteHeader(http.StatusOK)
	} else {
		http.Error(w, "not found", http.StatusNotFound)
	}
}

// ArchiveCounter handles PUT/PATCH /api/counters/{id}
func ArchiveCounter(w http.ResponseWriter, r *http.Request, userID int) {
	counterIDStr := r.PathValue("id")
	counterID, err := strconv.Atoi(counterIDStr)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	var body struct {
		ArchiveTime *string `json:"archivetime"`
	}
	if e := json.NewDecoder(r.Body).Decode(&body); e != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	var t *time.Time
	if body.ArchiveTime != nil && *body.ArchiveTime != "" {
		parsed, err := time.Parse(time.RFC3339, *body.ArchiveTime)
		if err != nil {
			http.Error(w, "invalid date format", http.StatusBadRequest)
			return
		}
		t = &parsed
	}

	updated, err := db.SetCounterArchiveTime(userID, counterID, t)
	if err != nil {
		log.Printf("Set archive time failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if updated {
		w.WriteHeader(http.StatusOK)
	} else {
		http.Error(w, "not found", http.StatusNotFound)
	}
}

// DeleteCounter handles DELETE /api/counters/{id}
func DeleteCounter(w http.ResponseWriter, r *http.Request, userID int) {
	counterIDStr := r.PathValue("id")
	counterID, err := strconv.Atoi(counterIDStr)
	if err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	updated, err := db.SoftDeleteCounter(userID, counterID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	if updated {
		CountersDeletedTotal.Inc()
		w.WriteHeader(http.StatusOK)
	} else {
		http.Error(w, "not found", http.StatusNotFound)
	}
}
