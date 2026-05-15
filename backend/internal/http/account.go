package http

import (
    "encoding/json"
    "log"
    "net/http"
    "time"

    db "github.com/larsa/pwa-counter/backend/internal/db"
)

// AccountHandler returns JSON information of the authenticated user.
// It extracts the session cookie or API key, retrieves the user's identity,
// and responds with a JSON object containing the user's name and email.
// If authorization fails, it responds with 401 Unauthorized.
func AccountHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/account called: method=%s", r.Method)
    if r.Method != http.MethodGet && r.Method != http.MethodDelete {
        MethodNotAllowed(w, r)
        return
    }

    // Authenticate request (Session ONLY)
    sess, err := AuthenticateSessionRequest(r)
    if err != nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }
    email := sess.Email
    name := sess.Name

    if r.Method == http.MethodDelete {
        // Get user ID before anonymizing since email will change
        uid, err := db.GetUserIDByEmail(email)
        if err != nil {
            log.Printf("AccountHandler: GetUserIDByEmail failed: %v", err)
            http.Error(w, "internal server error", http.StatusInternalServerError)
            return
        }

        // Soft-delete all API keys for the user
        if err := db.SoftDeleteAllAPIKeysForUser(uid); err != nil {
            log.Printf("AccountHandler: SoftDeleteAllAPIKeysForUser failed: %v", err)
            // We continue even if this fails, but we could also return error.
            // Given it's a cleanup step, it might be okay to log and proceed,
            // but for consistency let's treat it as an error if we want absolute correctness.
        }

        // Anonymize the user in the database
        if err := db.AnonymizeUser(email); err != nil {
            log.Printf("AccountHandler: AnonymizeUser failed: %v", err)
            http.Error(w, "internal server error", http.StatusInternalServerError)
            return
        }
        UsersDeletedCount.Inc()

        // Delete the session cookie
        http.SetCookie(w, &http.Cookie{
            Name:     "session_id",
            Value:    "",
            Path:     "/",
            MaxAge:   -1,
            Expires:  time.Unix(0, 0),
            HttpOnly: true,
        })

        // Invalidate session data in Redis if it was used
        sessionCookie, err := r.Cookie("session_id")
        if err == nil && cache != nil {
            _ = cache.Del(r.Context(), sessionCookie.Value)
        }

        // Return success instead of redirecting.
        // The frontend handles the redirection to the landing page.
        w.WriteHeader(http.StatusNoContent)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    data := map[string]string{"name": name, "email": email}
    if err := json.NewEncoder(w).Encode(data); err != nil {
        log.Printf("AccountHandler: json encode failed: %v", err)
    }
}

// ConfirmSignupHandler handles the final step of account creation.
func ConfirmSignupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if cache == nil {
		http.Error(w, "Redis unavailable", http.StatusInternalServerError)
		return
	}

	val, err := cache.Get(r.Context(), "pending_signup:"+body.Token)
	if err != nil {
		http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
		return
	}

	var pending map[string]interface{}
	if err := json.Unmarshal([]byte(val), &pending); err != nil {
		http.Error(w, "Internal Error", http.StatusInternalServerError)
		return
	}

	email, okE := pending["email"].(string)
	name, okN := pending["name"].(string)
	accessToken, okA := pending["access_token"].(string)
	if !okE || !okN || !okA {
		http.Error(w, "Invalid pending user data", http.StatusInternalServerError)
		return
	}

	// Persist user in DB
	if _, err := db.AddUser(email, name); err != nil {
		log.Printf("ConfirmSignupHandler: AddUser failed: %v", err)
		http.Error(w, "Internal error creating account", http.StatusInternalServerError)
		return
	}
	UserCount.Inc()

	uid, err := db.GetUserIDByEmail(email)
	if err != nil {
		log.Printf("ConfirmSignupHandler: GetUserIDByEmail failed: %v", err)
		http.Error(w, "Internal error creating account", http.StatusInternalServerError)
		return
	}

	// Create session
	createSession(w, r, uid, email, name, accessToken)

	// Cleanup pending data
	_ = cache.Del(r.Context(), "pending_signup:"+body.Token)

	w.WriteHeader(http.StatusOK)
}
