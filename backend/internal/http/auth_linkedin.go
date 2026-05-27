package http

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

// LinkedInLoginHandler redirects to LinkedIn's OAuth 2.0 consent screen.
func LinkedInLoginHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth/linkedin called: method=%s path=%s", r.Method, r.URL.Path)
	clientID := os.Getenv("LINKEDIN_CLIENT_ID")
	redirectURI := os.Getenv("LINKEDIN_REDIRECT_URI")
	if clientID == "" || redirectURI == "" {
		http.Error(w, "LinkedIn OAuth config missing", http.StatusInternalServerError)
		return
	}

	// LinkedIn requires openid, profile, email scopes for user identity
	scope := "openid profile email"
	authURL := fmt.Sprintf("https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=%s&redirect_uri=%s&scope=%s", clientID, redirectURI, scope)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// LinkedInCallbackHandler handles the LinkedIn OAuth callback.
func LinkedInCallbackHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth/linkedin/callback called: method=%s path=%s", r.Method, r.URL.Path)

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing code", http.StatusBadRequest)
		return
	}

	accessToken, err := exchangeLinkedInCode(code)
	if err != nil {
		log.Printf("LinkedIn token exchange failed: %v", err)
		http.Error(w, "Token exchange failed", http.StatusInternalServerError)
		return
	}

	user, err := fetchLinkedInUser(accessToken)
	if err != nil {
		log.Printf("LinkedIn user fetch failed: %v", err)
		http.Error(w, "Failed to fetch user info", http.StatusInternalServerError)
		return
	}

	handleAuthSuccess(w, r, user.Email, user.Name, accessToken)
}

func exchangeLinkedInCode(code string) (string, error) {
	tokenURL := "https://www.linkedin.com/oauth/v2/accessToken"
	clientID := os.Getenv("LINKEDIN_CLIENT_ID")
	clientSecret := os.Getenv("LINKEDIN_CLIENT_SECRET")
	redirectURI := os.Getenv("LINKEDIN_REDIRECT_URI")
	if clientID == "" || clientSecret == "" || redirectURI == "" {
		return "", fmt.Errorf("missing LinkedIn OAuth credentials in environment")
	}

	data := fmt.Sprintf("grant_type=authorization_code&code=%s&client_id=%s&client_secret=%s&redirect_uri=%s", code, clientID, clientSecret, redirectURI)
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
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", err
	}

	if tokenResp.Error != "" {
		return "", fmt.Errorf("linkedin token error: %s (%s)", tokenResp.Error, tokenResp.ErrorDesc)
	}
	return tokenResp.AccessToken, nil
}

type linkedinUser struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Sub   string `json:"sub"`
}

func fetchLinkedInUser(token string) (*linkedinUser, error) {
	req, err := http.NewRequest("GET", "https://api.linkedin.com/v2/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("linkedin user api returned %d", resp.StatusCode)
	}

	var user linkedinUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return &user, nil
}
