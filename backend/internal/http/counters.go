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

// CountersHandler implements CRUD operations for counters. It supports
// GET, POST, and DELETE on the paths /api/counters and /api/counters/:id.
func CountersHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/counters called: method=%s path=%s", r.Method, r.URL.Path)

    // Authenticate request (via API key or session cookie)
    sess, err := AuthenticateRequest(r)
    if err != nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }
    userID := sess.UserID

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
        // Use the step provided in the request body.
        counter, err := db.InsertCounter(userID, body.Name, body.Step)
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
            return
        }
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
    case http.MethodPatch, http.MethodPut:
        // PATCH/PUT /api/counters or /api/counters/:id
        if r.URL.Path == "/api/counters" || r.URL.Path == "/api/counters/" {
            var body struct {
                ID   int    `json:"id"`
                Name string `json:"name"`
                Step int    `json:"step"`
            }
            if e := json.NewDecoder(r.Body).Decode(&body); e != nil {
                http.Error(w, "bad request", http.StatusBadRequest)
                return
            }
            updated, err := db.UpdateCounter(userID, body.ID, body.Name, body.Step)
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
            return
        } else if strings.HasPrefix(r.URL.Path, "/api/counters/") {
            // PATCH /api/counters/:id for archive time
            idStr := strings.TrimPrefix(r.URL.Path, "/api/counters/")
            counterID, err := strconv.Atoi(idStr)
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
            return
        } else {
            http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
            return
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
            CountersDeletedTotal.Inc()
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
