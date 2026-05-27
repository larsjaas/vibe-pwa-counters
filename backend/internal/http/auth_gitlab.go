package http

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

// GitLabLoginHandler redirects to GitLab's OAuth authorization screen.
func GitLabLoginHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth/gitlab called: method=%s path=%s", r.Method, r.URL.Path)
	clientID := os.Getenv("GITLAB_CLIENT_ID")
	redirectURI := os.Getenv("GITLAB_REDIRECT_URI")
	if clientID == "" || redirectURI == "" {
		http.Error(w, "GitLab OAuth config missing", http.StatusInternalServerError)
		return
	}
	// Request read_user and openid scopes
	authURL := fmt.Sprintf("https://gitlab.com/oauth/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=read_user,openid", clientID, redirectURI)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// GitLabCallbackHandler handles the GitLab OAuth callback.
func GitLabCallbackHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth/gitlab/callback called: method=%s path=%s", r.Method, r.URL.Path)

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing code", http.StatusBadRequest)
		return
	}

	accessToken, err := exchangeGitLabCode(code)
	if err != nil {
		log.Printf("GitLab token exchange failed: %v", err)
		http.Error(w, "Token exchange failed", http.StatusInternalServerError)
		return
	}

	user, err := fetchGitLabUser(accessToken)
	if err != nil {
		log.Printf("GitLab user fetch failed: %v", err)
		http.Error(w, "Failed to fetch user info", http.StatusInternalServerError)
		return
	}

	handleAuthSuccess(w, r, user.Email, user.Name, accessToken)
}

func exchangeGitLabCode(code string) (string, error) {
	tokenURL := "https://gitlab.com/oauth/token"
	clientID := os.Getenv("GITLAB_CLIENT_ID")
	clientSecret := os.Getenv("GITLAB_CLIENT_SECRET")
	redirectURI := os.Getenv("GITLAB_REDIRECT_URI")
	if clientID == "" || clientSecret == "" || redirectURI == "" {
		return "", fmt.Errorf("missing GitLab OAuth credentials in environment")
	}

	data := fmt.Sprintf("client_id=%s&client_secret=%s&code=%s&grant_type=authorization_code&redirect_uri=%s", clientID, clientSecret, code, redirectURI)
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
		return "", fmt.Errorf("gitlab token error: %s (%s)", tokenResp.Error, tokenResp.ErrorDesc)
	}
	return tokenResp.AccessToken, nil
}

type gitlabUser struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func fetchGitLabUser(token string) (*gitlabUser, error) {
	req, err := http.NewRequest("GET", "https://gitlab.com/api/v4/user", nil)
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
		return nil, fmt.Errorf("gitlab user api returned %d", resp.StatusCode)
	}

	var user gitlabUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return &user, nil
}
