package http

import (
    "database/sql"
    "encoding/json"
    "log"
    "net/http"
    "strings"
    "strconv"

    db "github.com/larsa/pwa-counter/backend/internal/db"
)

// CountHandler handles GET, POST, and DELETE /api/counts requests.
// GET returns all count records for counters owned by the authenticated user.
// POST inserts a new record into the `counts` table. The request body must
// contain a JSON object with at least the fields `counter` (the ID of the
// counter to update) and `delta` (the integer change to record). The
// handler validates that the counter belongs to the authenticated user via
// a quick ownership check. If the counter does not belong to the user or
// does not exist / has been deleted, a 403 Forbidden is returned.
// DELETE /api/counts/{id} soft deletes a count record if the user owns the counter.
func CountHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/counts called: method=%s", r.Method)
    if r.Method != http.MethodPost && r.Method != http.MethodGet && r.Method != http.MethodDelete {
        http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
        return
    }

    // Validate session cookie and retrieve user ID.
    sessionCookie, err := r.Cookie("session_id")
    if err != nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }
    var userID int
    if redisClient != nil {
        ctx := r.Context()
        val, err := redisClient.Get(ctx, sessionCookie.Value).Result()
        if err != nil {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        var sess map[string]interface{}
        if e := json.Unmarshal([]byte(val), &sess); e == nil {
            if uid, ok := sess["user_id"].(float64); ok {
                userID = int(uid)
            }
        }
    }
    if userID == 0 {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    if r.Method == http.MethodGet {
        counts, err := db.GetCountsForUser(userID)
        if err != nil {
            http.Error(w, "internal server error", http.StatusInternalServerError)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        if err := json.NewEncoder(w).Encode(counts); err != nil {
            log.Printf("JSON encode failed: %v", err)
        }
        return
    }

    if r.Method == http.MethodDelete {
        if !strings.HasPrefix(r.URL.Path, "/api/counts/") {
            http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
            return
        }
        idStr := strings.TrimPrefix(r.URL.Path, "/api/counts/")
        countID, err := strconv.Atoi(idStr)
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
            w.WriteHeader(http.StatusOK)
        } else {
            http.Error(w, "not found", http.StatusNotFound)
        }
        return
    }

    // POST logic follows.
    // Parse request body.
    var payload struct {
        Counter int `json:"counter"`
        Delta   int `json:"delta"`
    }
    if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
        http.Error(w, "bad request", http.StatusBadRequest)
        return
    }

    // Validate counter ownership.
    counterOwner, err := db.GetUserIdForCounter(payload.Counter)
    if err != nil {
        if err == sql.ErrNoRows {
            http.Error(w, "not found", http.StatusNotFound)
            return
        } else {
            http.Error(w, "internal server error", http.StatusInternalServerError)
            return
        }
    }
    if counterOwner != userID {
        http.Error(w, "Forbidden", http.StatusForbidden)
        return
    }

    // Insert count.
    c, err := db.InsertCount(payload.Counter, payload.Delta)
    if err != nil {
        http.Error(w, "internal server error", http.StatusInternalServerError)
        return
    }
    CountsTotal.Inc()
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(c); err != nil {
        // Log encoding errors if needed.
        return
    }
}
