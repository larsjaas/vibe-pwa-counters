package http

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "os"
    "time"

    "github.com/larsa/pwa-counter/backend/internal/email"
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

// RequestNotificationEmailHandler initiates the process of changing the notification email.
// It sends a verification link to the new email address.
func RequestNotificationEmailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	sess, err := AuthenticateRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if body.Email == "" {
		http.Error(w, "email required", http.StatusBadRequest)
		return
	}

	if cache == nil {
		http.Error(w, "Redis unavailable", http.StatusInternalServerError)
		return
	}

	token := GenerateSessionID()
	pending := map[string]interface{}{
		"user_id": sess.UserID,
		"email":   body.Email,
	}
	payload, _ := json.Marshal(pending)
	
	// Store in Redis for 24 hours
	err = cache.Set(r.Context(), "pending_notification_email:"+token, string(payload), 24*time.Hour)
	if err != nil {
		log.Printf("RequestNotificationEmailHandler: Redis set failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Send verification email
	subject := "Verify your notification email address"
	fqhn := os.Getenv("SERVER_FQHN")
	if fqhn == "" {
		fqhn = "counters.crudbytes.com"
	}
	bodyText := fmt.Sprintf("Please click the link below to verify your notification email address:\n\nhttps://%s/verify-email?token=%s", fqhn, token)
	
	if err := email.SendEmail(body.Email, subject, bodyText); err != nil {
		log.Printf("RequestNotificationEmailHandler: SendEmail failed: %v", err)
		// We don't necessarily return error because the token is already stored, 
		// but it's better to tell the user.
		http.Error(w, "failed to send verification email", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
}

// VerifyNotificationEmailHandler confirms ownership of the notification email address.
func VerifyNotificationEmailHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if cache == nil {
		http.Error(w, "Redis unavailable", http.StatusInternalServerError)
		return
	}

	val, err := cache.Get(r.Context(), "pending_notification_email:"+body.Token)
	if err != nil {
		http.Error(w, "invalid or expired token", http.StatusUnauthorized)
		return
	}

	var pending map[string]interface{}
	if err := json.Unmarshal([]byte(val), &pending); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	uid, okU := pending["user_id"].(float64)
	emailAddr, okE := pending["email"].(string)
	if !okU || !okE {
		http.Error(w, "invalid pending data", http.StatusInternalServerError)
		return
	}

	// Update user setting in DB
	if err := db.SetUserSetting(int(uid), "notification_email", emailAddr); err != nil {
		log.Printf("VerifyNotificationEmailHandler: SetUserSetting failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	// Cleanup Redis
	_ = cache.Del(r.Context(), "pending_notification_email:"+body.Token)

	w.WriteHeader(http.StatusOK)
}

