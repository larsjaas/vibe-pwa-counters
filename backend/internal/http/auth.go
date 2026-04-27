package http

// Package http provides authentication handlers for the REST backend.
// These handlers are exported and used by the main server package.
// The handlers are deliberately named with a leading capital letter to
// make them visible across packages. The internal package name is
// `http` but aliased when imported to avoid clashing with the standard
// library `net/http`.

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net"
	"os"
	"strings"
	"time"

	db "github.com/larsa/pwa-counter/backend/internal/db"
	redis "github.com/redis/go-redis/v9"
)

// redisClient holds a global Redis client shared across handlers.
var redisClient *redis.Client

// SetRedisClient allows the server bootstrap code to inject a Redis client.
func SetRedisClient(rdb *redis.Client) {
    redisClient = rdb
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
		// If API key was provided but invalid, we could either fail immediately 
		// or fall back to the cookie. Standard behavior often fails immediately.
		// For now, let's fall back to allow users who have both.
	}

	// 2. Try Session Cookie
	sessionCookie, err := r.Cookie("session_id")
	if err != nil {
		return nil, fmt.Errorf("unauthorized: no session cookie")
	}
	if redisClient == nil {
		return nil, fmt.Errorf("unauthorized: redis unavailable")
	}

	val, err := redisClient.Get(r.Context(), sessionCookie.Value).Result()
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
    if err == nil && redisClient != nil {
        // Ensure we delete the key to avoid stale entries.
        _ = redisClient.Del(context.Background(), cookie.Value)
        sessionCount.Dec()
    }
    http.Redirect(w, r, "/landing_page/index.html", http.StatusFound)
}

// ValidateSessionHandler verifies the presence of a session cookie.
func ValidateSessionHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/validate-session called: method=%s path=%s", r.Method, r.URL.Path)
    cookie, err := r.Cookie("session_id")
    if err != nil || redisClient == nil {
        http.Error(w, "Invalid session", http.StatusUnauthorized)
        return
    }
    ctx := context.Background()
    val, err := redisClient.Get(ctx, cookie.Value).Result()
    if err == redis.Nil || err != nil {
        http.Error(w, "Invalid session", http.StatusUnauthorized)
        return
    }
    log.Printf("Session data for %s: %s", cookie.Value, val)
    fmt.Fprintf(w, "Ping: %s", "ok")
}

// LoginHandler redirects to Google's OAuth 2.0 consent screen.
func LoginHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/login called: method=%s path=%s", r.Method, r.URL.Path)
    clientID := os.Getenv("GOOGLE_CLIENT_ID")
    redirectURI := os.Getenv("GOOGLE_REDIRECT_URI")
    if clientID == "" || redirectURI == "" {
        http.Error(w, "Google OAuth config missing", http.StatusInternalServerError)
        return
    }
    scope := "openid email profile"
    authURL := fmt.Sprintf("https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=%s", clientID, redirectURI, scope)
    http.Redirect(w, r, authURL, http.StatusFound)
}

// AuthCallbackHandler handles the OAuth callback, exchanging the code for
// tokens, persisting user data, creating a session stored in Redis, and
// setting a session_id cookie.
func AuthCallbackHandler(w http.ResponseWriter, r *http.Request) {
    // Log request details for tracing.
    log.Printf("/api/auth/google/callback called: method=%s path=%s", r.Method, r.URL.Path)

    // 1. Extract the authorization code from query string.
    code := r.URL.Query().Get("code")
    if code == "" {
        http.Error(w, "Missing code", http.StatusBadRequest)
        return
    }

    // 2. Exchange the code for tokens.
    accessToken, idToken, err := exchangeCode(code)
    if err != nil {
        log.Printf("Token exchange failed: %v", err)
        http.Error(w, "Token exchange failed", http.StatusInternalServerError)
        return
    }

    // 3. Decode user information from id_token.
    email, name, err := parseUserInfoFromIDToken(idToken)
    if err != nil {
        log.Printf("Failed to parse id_token: %v", err)
    }

    // 4. Persist user in database if not present.
    var userID int
    if email != "" {
        exists, err := db.UserExists(email)
        if err != nil {
            log.Printf("DB check failed: %v", err)
        }
        if !exists {
            // NEW: Store pending user and redirect to confirmation page.
            signupToken := generateSessionID()
            pendingUser := map[string]interface{}{
                "email":        email,
                "name":         name,
                "access_token": accessToken,
            }
            payload, _ := json.Marshal(pendingUser)
            if redisClient != nil {
                err := redisClient.Set(context.Background(), "pending_signup:"+signupToken, string(payload), 15*time.Minute).Err()
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
    }

    // 5. Create session and set cookie.
    createSession(w, r, userID, email, name, accessToken)

    // Redirect the user to the home page.
    http.Redirect(w, r, "/", http.StatusFound)
}

// exchangeCode posts the OAuth authorization code to the token endpoint and
// returns the access token and id_token.
func exchangeCode(code string) (accessToken string, idToken string, err error) {
    tokenURL := "https://oauth2.googleapis.com/token"
    clientID := os.Getenv("GOOGLE_CLIENT_ID")
    clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
    redirectURI := os.Getenv("GOOGLE_REDIRECT_URI")
    if clientID == "" || clientSecret == "" || redirectURI == "" {
        err = fmt.Errorf("missing OAuth credentials in environment")
        return
    }

    data := fmt.Sprintf("code=%s&client_id=%s&client_secret=%s&redirect_uri=%s&grant_type=authorization_code", code, clientID, clientSecret, redirectURI)
    req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data))
    if err != nil {
        return
    }
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return
    }
    defer resp.Body.Close()
    if resp.StatusCode != http.StatusOK {
        var buf bytes.Buffer
        _, _ = io.Copy(&buf, resp.Body)
        err = fmt.Errorf("token endpoint returned %d: %s", resp.StatusCode, buf.String())
        return
    }

    var tokenResp struct {
        AccessToken string `json:"access_token"`
        IDToken     string `json:"id_token"`
    }
    body, _ := io.ReadAll(resp.Body)
    if err = json.Unmarshal(body, &tokenResp); err != nil {
        return
    }
    accessToken = tokenResp.AccessToken
    idToken = tokenResp.IDToken
    return
}

// parseUserInfoFromIDToken decodes the JWT id_token and extracts the
// "email" and "name" claims.
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
    }
    if v, ok := claims["name"].(string); ok {
        name = v
    }
    return
}


// generateSessionID creates a cryptographically secure, base64 URL
// encoded session identifier.
func generateSessionID() string {
    b := make([]byte, 32) // 256 bits
    if _, err := rand.Read(b); err != nil {
        // Fallback to time-based seed; extremely unlikely to hit.
        now := time.Now().UnixNano()
        return base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf("%d", now)))
    }
    return base64.RawURLEncoding.EncodeToString(b)
}

// createSession helper encapsulates the session creation logic.
func createSession(w http.ResponseWriter, r *http.Request, userID int, email, name, accessToken string) {
    sessionID := generateSessionID()
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

    if redisClient != nil {
        ctx := context.Background()
        payload, _ := json.Marshal(session)
        err := redisClient.Set(ctx, sessionID, string(payload), 72*time.Hour).Err()
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
