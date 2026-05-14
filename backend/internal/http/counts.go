package http

import (
    "encoding/json"
    "log"
    "net/http"
    "strconv"
    "strings"
    "time"

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
    if r.Method != http.MethodPost && r.Method != http.MethodGet && r.Method != http.MethodDelete && r.Method != http.MethodPut {
        http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
        return
    }

    // Authenticate request (via API key or session cookie)
    sess, err := AuthenticateRequest(r)
    if err != nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }
    userID := sess.UserID

    if r.Method == http.MethodGet {
        counts, err := db.GetCountsForUser(userID)
        if err != nil {
            http.Error(w, "internal server error", http.StatusInternalServerError)
            return
        }

        type countResponse struct {
            ID         int       `json:"id"`
            CounterID  int       `json:"counter"`
            UserEmail  string    `json:"user_email"`
            Delta      int       `json:"delta"`
            When       time.Time `json:"when"`
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
                When:      c.When,
                DeleteTime: c.DeleteTime,
            })
        }

        w.Header().Set("Content-Type", "application/json")
        if err := json.NewEncoder(w).Encode(resp); err != nil {
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
        return
    }

    if r.Method == http.MethodPut {
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
    c, err := db.InsertCount(payload.Counter, userID, payload.Delta)
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
        // Log encoding errors if needed.
        return
    }
}
