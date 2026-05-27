package http

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

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
	}

	handleAuthSuccess(w, r, email, name, accessToken)
}

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
