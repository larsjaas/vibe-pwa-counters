package http

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

// MetaLoginHandler redirects to Meta's OAuth 2.0 consent screen.
func MetaLoginHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth/facebook called: method=%s path=%s", r.Method, r.URL.Path)
	clientID := os.Getenv("FACEBOOK_APP_ID")
	redirectURI := os.Getenv("FACEBOOK_REDIRECT_URI")
	if clientID == "" || redirectURI == "" {
		http.Error(w, "Meta OAuth config missing", http.StatusInternalServerError)
		return
	}
	// Request public_profile and email scopes
	authURL := fmt.Sprintf("https://www.facebook.com/v18.0/dialog/oauth?client_id=%s&redirect_uri=%s&scope=email,public_profile&response_type=code", clientID, redirectURI)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// MetaCallbackHandler handles the Meta OAuth callback.
func MetaCallbackHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth/facebook/callback called: method=%s path=%s", r.Method, r.URL.Path)

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing code", http.StatusBadRequest)
		return
	}

	accessToken, err := exchangeMetaCode(code)
	if err != nil {
		log.Printf("Meta token exchange failed: %v", err)
		http.Error(w, "Token exchange failed", http.StatusInternalServerError)
		return
	}

	user, err := fetchMetaUser(accessToken)
	if err != nil {
		log.Printf("Meta user fetch failed: %v", err)
		http.Error(w, "Failed to fetch user info", http.StatusInternalServerError)
		return
	}

	handleAuthSuccess(w, r, user.Email, user.Name, accessToken)
}

func exchangeMetaCode(code string) (string, error) {
	tokenURL := "https://graph.facebook.com/v18.0/oauth/access_token"
	clientID := os.Getenv("FACEBOOK_APP_ID")
	clientSecret := os.Getenv("FACEBOOK_APP_SECRET")
	redirectURI := os.Getenv("FACEBOOK_REDIRECT_URI")
	if clientID == "" || clientSecret == "" || redirectURI == "" {
		return "", fmt.Errorf("missing Meta OAuth credentials in environment")
	}

	data := fmt.Sprintf("client_id=%s&client_secret=%s&code=%s&redirect_uri=%s", clientID, clientSecret, code, redirectURI)
	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Error       struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", err
	}

	if tokenResp.Error.Message != "" {
		return "", fmt.Errorf("meta token error: %s", tokenResp.Error.Message)
	}
	return tokenResp.AccessToken, nil
}

type metaUser struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func fetchMetaUser(token string) (*metaUser, error) {
	url := fmt.Sprintf("https://graph.facebook.com/me?fields=id,name,email&access_token=%s", token)
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("meta user api returned %d", resp.StatusCode)
	}

	var user metaUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return &user, nil
}
