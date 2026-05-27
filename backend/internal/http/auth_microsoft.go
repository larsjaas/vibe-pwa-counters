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

// MicrosoftLoginHandler redirects to Microsoft's OAuth 2.0 consent screen.
func MicrosoftLoginHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth/microsoft called: method=%s path=%s", r.Method, r.URL.Path)
	clientID := os.Getenv("MICROSOFT_CLIENT_ID")
	redirectURI := os.Getenv("MICROSOFT_REDIRECT_URI")
	if clientID == "" || redirectURI == "" {
		http.Error(w, "Microsoft OAuth config missing", http.StatusInternalServerError)
		return
	}
	scope := "openid profile email"
	authURL := fmt.Sprintf("https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=%s", clientID, redirectURI, scope)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// MicrosoftCallbackHandler handles the Microsoft OAuth callback.
func MicrosoftCallbackHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth/microsoft/callback called: method=%s path=%s", r.Method, r.URL.Path)

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing code", http.StatusBadRequest)
		return
	}

	accessToken, idToken, err := exchangeMicrosoftCode(code)
	if err != nil {
		log.Printf("Microsoft token exchange failed: %v", err)
		http.Error(w, "Token exchange failed", http.StatusInternalServerError)
		return
	}

	email, name, err := parseUserInfoFromIDToken(idToken)
	if err != nil {
		log.Printf("Failed to parse Microsoft id_token: %v", err)
	}

	handleAuthSuccess(w, r, email, name, accessToken)
}

func exchangeMicrosoftCode(code string) (accessToken string, idToken string, err error) {
	tokenURL := "https://login.microsoftonline.com/common/oauth2/v2.0/token"
	clientID := os.Getenv("MICROSOFT_CLIENT_ID")
	clientSecret := os.Getenv("MICROSOFT_CLIENT_SECRET")
	redirectURI := os.Getenv("MICROSOFT_REDIRECT_URI")
	if clientID == "" || clientSecret == "" || redirectURI == "" {
		err = fmt.Errorf("missing Microsoft OAuth credentials in environment")
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
		err = fmt.Errorf("Microsoft token endpoint returned %d: %s", resp.StatusCode, buf.String())
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
