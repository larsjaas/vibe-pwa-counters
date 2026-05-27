package http

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
)

// GitHubLoginHandler redirects to GitHub's OAuth authorization screen.
func GitHubLoginHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth/github called: method=%s path=%s", r.Method, r.URL.Path)
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	if clientID == "" {
		http.Error(w, "GitHub OAuth config missing", http.StatusInternalServerError)
		return
	}
	// Request read:user and user:email scopes
	authURL := fmt.Sprintf("https://github.com/login/oauth/authorize?client_id=%s&scope=read:user,user:email", clientID)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// GitHubCallbackHandler handles the GitHub OAuth callback.
func GitHubCallbackHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/auth/github/callback called: method=%s path=%s", r.Method, r.URL.Path)

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing code", http.StatusBadRequest)
		return
	}

	accessToken, err := exchangeGitHubCode(code)
	if err != nil {
		log.Printf("GitHub token exchange failed: %v", err)
		http.Error(w, "Token exchange failed", http.StatusInternalServerError)
		return
	}

	user, err := fetchGitHubUser(accessToken)
	if err != nil {
		log.Printf("GitHub user fetch failed: %v", err)
		http.Error(w, "Failed to fetch user info", http.StatusInternalServerError)
		return
	}

	email, err := fetchGitHubEmail(accessToken)
	if err != nil {
		log.Printf("GitHub email fetch failed: %v", err)
		// We can try to use the email from user profile if available
		email = user.Email
	}

	handleAuthSuccess(w, r, email, user.Name, accessToken)
}

func exchangeGitHubCode(code string) (string, error) {
	tokenURL := "https://github.com/login/oauth/access_token"
	clientID := os.Getenv("GITHUB_CLIENT_ID")
	clientSecret := os.Getenv("GITHUB_CLIENT_SECRET")
	if clientID == "" || clientSecret == "" {
		return "", fmt.Errorf("missing GitHub OAuth credentials")
	}

	data := fmt.Sprintf("code=%s&client_id=%s&client_secret=%s", code, clientID, clientSecret)
	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", err
	}
	if tokenResp.Error != "" {
		return "", fmt.Errorf("github token error: %s", tokenResp.Error)
	}
	return tokenResp.AccessToken, nil
}

type githubUser struct {
	Login     string `json:"login"`
	Name      string `json:"name"`
	Email     string `json:"email"`
}

func fetchGitHubUser(token string) (*githubUser, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/user", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("github user api returned %d", resp.StatusCode)
	}

	var user githubUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, err
	}
	return &user, nil
}

func fetchGitHubEmail(token string) (string, error) {
	req, err := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github email api returned %d", resp.StatusCode)
	}

	var emails []struct {
		Email    string `json:"email"`
		Verified bool   `json:"verified"`
		Primary  bool   `json:"primary"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&emails); err != nil {
		return "", err
	}

	for _, e := range emails {
		if e.Primary && e.Verified {
			return e.Email, nil
		}
	}
	if len(emails) > 0 {
		return emails[0].Email, nil
	}
	return "", fmt.Errorf("no email found")
}
