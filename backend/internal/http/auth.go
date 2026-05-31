package http

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	db "github.com/larsa/pwa-counter/backend/internal/db"
	redis "github.com/redis/go-redis/v9"
)

// cache holds a global robust cache fronting Redis.
var cache *Cache

// SetRedisClient allows the server bootstrap code to inject a Redis client.
func SetRedisClient(rdb *redis.Client) {
	cache = NewCache(rdb)
}

// UserSession contains authentication and identity information for a request.
type UserSession struct {
	UserID int
	Email  string
	Name   string
}

// AuthenticateRequest attempts to identify the user from either the
// Authorization header (Bearer token) or the session cookie.
// It returns the UserSession if successful, or an error if unauthorized.
func AuthenticateRequest(r *http.Request) (*UserSession, error) {
	// 1. Try API Key from Authorization header
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		apiKey := strings.TrimPrefix(authHeader, "Bearer ")
		uid, err := db.GetUserIDByAPIKey(apiKey)
		if err == nil {
			user, err := db.GetUserByID(uid)
			if err == nil {
				return &UserSession{
					UserID: user.ID,
					Email:  user.Email,
					Name:   user.Name,
				}, nil
			}
		}
	}

	// 2. Try Session Cookie
	return AuthenticateSessionRequest(r)
}

// AuthenticateSessionRequest identifies the user using ONLY the session cookie.
func AuthenticateSessionRequest(r *http.Request) (*UserSession, error) {
	sessionCookie, err := r.Cookie("session_id")
	if err != nil {
		return nil, fmt.Errorf("unauthorized: no session cookie")
	}
	if cache == nil {
		return nil, fmt.Errorf("unauthorized: redis unavailable")
	}

	val, err := cache.Get(r.Context(), sessionCookie.Value)
	if err != nil {
		return nil, fmt.Errorf("unauthorized: invalid session")
	}
	var sess map[string]interface{}
	if e := json.Unmarshal([]byte(val), &sess); e != nil {
		return nil, fmt.Errorf("unauthorized: session decode failed")
	}

	uid, okU := sess["user_id"].(float64)
	email, okE := sess["user_email"].(string)
	name, okN := sess["user_name"].(string)

	if !okU || !okE || !okN {
		return nil, fmt.Errorf("unauthorized: session data incomplete")
	}

	return &UserSession{
		UserID: int(uid),
		Email:  email,
		Name:   name,
	}, nil
}

// LogoutHandler clears the session cookie and redirects the user to the
// landing page.
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/logout called: method=%s path=%s", r.Method, r.URL.Path)
	// Delete the session cookie and remove the session entry from Redis.
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
	})
	cookie, err := r.Cookie("session_id")
	if err == nil && cache != nil {
		// Ensure we delete the key to avoid stale entries.
		_ = cache.Del(context.Background(), cookie.Value)
		sessionCount.Dec()
	}
	http.Redirect(w, r, "/landing_page/index.html", http.StatusFound)
}

// ValidateSessionHandler verifies the presence of a session cookie.
func ValidateSessionHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/validate-session called: method=%s path=%s", r.Method, r.URL.Path)
	cookie, err := r.Cookie("session_id")
	if err != nil || cache == nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}
	ctx := context.Background()
	val, err := cache.Get(ctx, cookie.Value)
	if err != nil {
		http.Error(w, "Invalid session", http.StatusUnauthorized)
		return
	}
	log.Printf("Session data for %s: %s", cookie.Value, val)
	fmt.Fprintf(w, "Ping: %s", "ok")
}

// handleAuthSuccess persists user in database if not present,
// handles pending signups, and creates a session.
func handleAuthSuccess(w http.ResponseWriter, r *http.Request, email, name, accessToken string) {
	if email == "" {
		http.Error(w, "missing email from provider", http.StatusInternalServerError)
		return
	}

	var userID int
	exists, err := db.UserExists(email)
	if err != nil {
		log.Printf("DB check failed: %v", err)
	}
	if !exists {
		// Store pending user and redirect to confirmation page.
		signupToken := GenerateSessionID()
		pendingUser := map[string]interface{}{
			"email":        email,
			"name":         name,
			"access_token": accessToken,
		}
		payload, _ := json.Marshal(pendingUser)
		if cache != nil {
			err := cache.Set(context.Background(), "pending_signup:"+signupToken, string(payload), 15*time.Minute)
			if err != nil {
				log.Printf("Redis pending store error: %v", err)
			}
		}
		http.Redirect(w, r, "/landing_page/confirm-signup.html?token="+signupToken, http.StatusFound)
		return
	}
	uid, err := db.GetUserIDByEmail(email)
	if err == nil {
		userID = uid
	}

	// Create session and set cookie.
	createSession(w, r, userID, email, name, accessToken)

	// Redirect the user to the home page.
	http.Redirect(w, r, "/", http.StatusFound)
}

// parseUserInfoFromIDToken decodes the JWT id_token and extracts the
// "email" and "name" claims. It is used by Google and Microsoft providers.
func parseUserInfoFromIDToken(idToken string) (email, name string, err error) {
	parts := strings.Split(idToken, ".")
	if len(parts) != 3 {
		err = fmt.Errorf("invalid id_token format")
		return
	}
	payload, e := base64.RawURLEncoding.DecodeString(parts[1])
	if e != nil {
		err = e
		return
	}
	var claims map[string]interface{}
	if e = json.Unmarshal(payload, &claims); e != nil {
		err = e
		return
	}
	if v, ok := claims["email"].(string); ok {
		email = v
	} else if v, ok := claims["preferred_username"].(string); ok {
		// Fallback for Microsoft Entra ID
		email = v
	}
	if v, ok := claims["name"].(string); ok {
		name = v
	}
	return
}

// GenerateSessionID creates a cryptographically secure, base64 URL
// encoded session identifier.
func GenerateSessionID() string {
	b := make([]byte, 32) // 256 bits
	if _, err := rand.Read(b); err != nil {
		now := time.Now().UnixNano()
		return base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf("%d", now)))
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

// WithAuth is a middleware wrapper that authenticates the request and
// injects the userID into the handler.
func WithAuth(handler func(http.ResponseWriter, *http.Request, int)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sess, err := AuthenticateRequest(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		handler(w, r, sess.UserID)
	}
}

// WithSessionAuth is a middleware wrapper that authenticates the request
// using ONLY the session cookie and injects the userID into the handler.
func WithSessionAuth(handler func(http.ResponseWriter, *http.Request, int)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sess, err := AuthenticateSessionRequest(r)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		handler(w, r, sess.UserID)
	}
}

func createSession(w http.ResponseWriter, r *http.Request, userID int, email, name, accessToken string) {
	sessionID := GenerateSessionID()
	session := map[string]interface{}{
		"session_id":   sessionID,
		"user_id":      userID,
		"user_email":   email,
		"user_name":    name,
		"access_token": accessToken,
		"created_at":   time.Now().Format(time.RFC3339),
		"expires_at":   time.Now().Add(72 * time.Hour).Format(time.RFC3339),
	}

	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	if ip == "" {
		ip = r.RemoteAddr
	}
	session["user_ip"] = ip
	session["user_agent"] = r.Header.Get("User-Agent")

	if cache != nil {
		ctx := context.Background()
		payload, _ := json.Marshal(session)
		err := cache.Set(ctx, sessionID, string(payload), 72*time.Hour)
		if err != nil {
			log.Printf("Redis session store error: %v", err)
		}
		sessionCount.Inc()

		// Update last login time in database
		if userID != 0 {
			if err := db.UpdateLastLogin(userID); err != nil {
				log.Printf("DB last-login update error: %v", err)
			}
		}
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})
}

// AuthProvider represents a configured OAuth provider.
type AuthProvider struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// AuthProvidersHandler returns the list of configured OAuth providers.
func AuthProvidersHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth-providers called: method=%s", r.Method)
	if r.Method != http.MethodGet {
		MethodNotAllowed(w, r)
		return
	}

	providers := []AuthProvider{}

	if os.Getenv("GOOGLE_CLIENT_ID") != "" && os.Getenv("GOOGLE_REDIRECT_URI") != "" {
		providers = append(providers, AuthProvider{ID: "google", Name: "Google"})
	}
	if os.Getenv("GITHUB_CLIENT_ID") != "" {
		providers = append(providers, AuthProvider{ID: "github", Name: "GitHub"})
	}
	if os.Getenv("MICROSOFT_CLIENT_ID") != "" && os.Getenv("MICROSOFT_REDIRECT_URI") != "" {
		providers = append(providers, AuthProvider{ID: "microsoft", Name: "Microsoft"})
	}
	if os.Getenv("FACEBOOK_APP_ID") != "" && os.Getenv("FACEBOOK_REDIRECT_URI") != "" {
		providers = append(providers, AuthProvider{ID: "facebook", Name: "Facebook"})
	}
	if os.Getenv("GITLAB_CLIENT_ID") != "" && os.Getenv("GITLAB_REDIRECT_URI") != "" {
		providers = append(providers, AuthProvider{ID: "gitlab", Name: "GitLab"})
	}
	if os.Getenv("LINKEDIN_CLIENT_ID") != "" && os.Getenv("LINKEDIN_REDIRECT_URI") != "" {
		providers = append(providers, AuthProvider{ID: "linkedin", Name: "LinkedIn"})
	}

	w.Header().Set("Content-Type", "application/json")
	payload, err := json.Marshal(providers)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	w.Write(payload)
}
