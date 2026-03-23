package http

// Package http provides authentication handlers for the REST backend.
// These handlers are exported and used by the main server package.
// The handlers are deliberately named with a leading capital letter to
// make them visible across packages. The internal package name is
// `http` but aliased when imported to avoid clashing with the standard
// library `net/http`.

import (
    "bytes"
    "encoding/base64"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "os"
    "log"
    "strings"
    "time"
    db "github.com/larsa/pwa-counter/backend/internal/db"
)

// LogoutHandler clears the session cookie and redirects the user to the
// landing page.
func LogoutHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/logout called: method=%s path=%s", r.Method, r.URL.Path)
    http.SetCookie(w, &http.Cookie{
        Name:     "session",
        Value:    "",
        Path:     "/",
        MaxAge:   -1,
        Expires:  time.Unix(0, 0),
        HttpOnly: true,
    })
    http.Redirect(w, r, "/landing_page/index.html", http.StatusFound)
}

// ValidateSessionHandler verifies the presence of a session cookie.
func ValidateSessionHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/validate-session called: method=%s path=%s", r.Method, r.URL.Path)
    _, err := r.Cookie("session")
    if err != nil {
        w.WriteHeader(http.StatusUnauthorized)
        return
    }
    w.WriteHeader(http.StatusOK)
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
// tokens and storing the access token in a cookie.
func AuthCallbackHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/auth/google/callback called: method=%s path=%s", r.Method, r.URL.Path)
    code := r.URL.Query().Get("code")
    if code == "" {
        http.Error(w, "Missing code", http.StatusBadRequest)
        return
    }

    accessToken, idToken, err := exchangeCode(code)
    if err != nil {
        log.Printf("Token exchange failed: %v", err)
        http.Error(w, "Token exchange failed", http.StatusInternalServerError)
        return
    }

    email, name, err := parseUserInfoFromIDToken(idToken)
    if err != nil {
        log.Printf("Failed to parse id_token: %v", err)
    } else {
        log.Printf("User logged in: email=%s, name=%s", email, name)
        // Persist the user into the database if it does not already exist.
        if email != "" {
            exists, e := db.UserExists(email)
            if e != nil {
                log.Printf("DB check failed: %v", e)
            } else if !exists {
                if _, e := db.AddUser(email, name); e != nil {
                    log.Printf("Failed to add new user: %v", e)
                } else {
                    log.Printf("Inserted new user: %s (%s)", email, name)
                }
            }
        }
    }

    http.SetCookie(w, &http.Cookie{
        Name:     "session",
        Value:    accessToken,
        Path:     "/",
        HttpOnly: true,
    })

    log.Printf("Auth code: %s", code)
    log.Printf("Access token: %s", accessToken)
    log.Printf("ID token: %s", idToken)

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
