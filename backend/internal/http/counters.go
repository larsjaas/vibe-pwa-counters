package http

import (
    "encoding/json"
    "log"
    "net/http"
    "strconv"
    "strings"

    db "github.com/larsa/pwa-counter/backend/internal/db"
)

// CountersHandler implements CRUD operations for counters. It supports
// GET, POST, and DELETE on the paths /api/counters and /api/counters/:id.
// The handler extracts the session_id cookie, fetches the user_id from
// Redis, and performs the requested operation against the database.
func CountersHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/counters called: method=%s path=%s", r.Method, r.URL.Path)

    // Validate session cookie and retrieve user_id.
    sessionCookie, err := r.Cookie("session_id")
    if err != nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }
    // Retrieve session data from Redis.
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

    switch r.Method {
    case http.MethodPost:
        // POST /api/counters
        if r.URL.Path != "/api/counters" && r.URL.Path != "/api/counters/" {
            http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
            return
        }
        var body struct {
            Name    string `json:"name"`
            Initial int    `json:"initial"`
            Step    int    `json:"step"`
        }
        if e := json.NewDecoder(r.Body).Decode(&body); e != nil {
            http.Error(w, "bad request", http.StatusBadRequest)
            return
        }
        // Ignore Initial and Step per specification. Step defaults in DB.
        if _, err := db.InsertCounter(userID, body.Name); err != nil {
            log.Printf("Insert counter failed: %v", err)
            http.Error(w, "internal server error", http.StatusInternalServerError)
            return
        }
        w.WriteHeader(http.StatusOK)
        return
    case http.MethodGet:
        // GET /api/counters
        if r.URL.Path != "/api/counters" && r.URL.Path != "/api/counters/" {
            http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
            return
        }
        counters, err := db.GetCountersForUser(userID)
        if err != nil {
            http.Error(w, "internal server error", http.StatusInternalServerError)
            return
        }
        w.Header().Set("Content-Type", "application/json")
        if err := json.NewEncoder(w).Encode(counters); err != nil {
            log.Printf("JSON encode failed: %v", err)
        }
        return
    case http.MethodDelete:
        // DELETE /api/counters/:id
        if !strings.HasPrefix(r.URL.Path, "/api/counters/") {
            http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
            return
        }
        idStr := strings.TrimPrefix(r.URL.Path, "/api/counters/")
        counterID, err := strconv.Atoi(idStr)
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
            w.WriteHeader(http.StatusOK)
        } else {
            http.Error(w, "not found", http.StatusNotFound)
        }
        return
    default:
        w.WriteHeader(http.StatusMethodNotAllowed)
        return
    }
}
