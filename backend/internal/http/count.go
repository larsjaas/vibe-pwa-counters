package http

import (
    "database/sql"
    "encoding/json"
    "log"
    "net/http"

    db "github.com/larsa/pwa-counter/backend/internal/db"
)

// CountHandler handles POST /api/count requests.
// It inserts a new record into the `count` table. The request body must
// contain a JSON object with at least the fields `counter` (the ID of the
// counter to update) and `delta` (the integer change to record).  The
// handler validates that the counter belongs to the authenticated user via
// a quick ownership check.  If the counter does not belong to the user or
// does not exist / has been deleted, a 403 Forbidden is returned.
// If the request is not a POST the handler will respond with StatusMethodNotAllowed.
func CountHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/count called: method=%s", r.Method)
    if r.Method != http.MethodPost {
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
        } else {
            http.Error(w, "internal server error", http.StatusInternalServerError)
        }
        return
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
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(c); err != nil {
        // Log encoding errors if needed.
        return
    }
}
