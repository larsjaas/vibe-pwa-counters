package http

import (
    "encoding/json"
    "log"
    "net/http"
)

// AccountHandler returns JSON information of the authenticated user.
// It extracts the session cookie, retrieves the session data from Redis,
// and responds with a JSON object containing the user's name and email.
// If the session is missing or invalid, it responds with 401 Unauthorized.
func AccountHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/account called: method=%s", r.Method)
    if r.Method != http.MethodGet {
        MethodNotAllowed(w, r)
        return
    }
    // Validate session cookie
    sessionCookie, err := r.Cookie("session_id")
    if err != nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }
    // Retrieve session from Redis
    var email, name string
    if redisClient != nil {
        ctx := r.Context()
        val, err := redisClient.Get(ctx, sessionCookie.Value).Result()
        if err != nil {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        var sess map[string]interface{}
        if e := json.Unmarshal([]byte(val), &sess); e == nil {
            if v, ok := sess["user_email"].(string); ok {
                email = v
            }
            if v, ok := sess["user_name"].(string); ok {
                name = v
            }
        }
    }
    if email == "" {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }
    w.Header().Set("Content-Type", "application/json")
    data := map[string]string{"name": name, "email": email}
    if err := json.NewEncoder(w).Encode(data); err != nil {
        log.Printf("AccountHandler: json encode failed: %v", err)
    }
}
