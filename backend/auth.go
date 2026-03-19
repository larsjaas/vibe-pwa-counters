package main

import (
    "fmt"
    "net/http"
    "os"
    "log"
)

// validateSessionHandler is a stub that always returns 200 OK.
// It acts as a health check for authentication.
func validateSessionHandler(w http.ResponseWriter, r *http.Request) {
    // In a real implementation, verify the session cookie or token here.
    w.WriteHeader(http.StatusOK)
}

// loginHandler redirects the user to Google's OAuth 2.0 consent screen.
// It requires GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI environment variables.
// For simplicity, no PKCE or state parameter is used.
func loginHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/login called: method=%s path=%s", r.Method, r.URL.Path)
    clientID := os.Getenv("GOOGLE_CLIENT_ID")
    redirectURI := os.Getenv("GOOGLE_REDIRECT_URI")
    if clientID == "" || redirectURI == "" {
        http.Error(w, "Google OAuth config missing", http.StatusInternalServerError)
        return
    }
    scope := "openid email profile"
    // Build the Google OAuth URL.
    authURL := fmt.Sprintf("https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=%s", clientID, redirectURI, scope)
    http.Redirect(w, r, authURL, http.StatusFound)
}

// authCallbackHandler processes the callback from Google after the user
// authorizes the application. In this simplified implementation we only
// capture the authorization code, set a session cookie, and redirect back
// to the application. FIXME: Real implementations should exchange the code for
// tokens and verify the ID token.
func authCallbackHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/api/auth/callback called: method=%s path=%s", r.Method, r.URL.Path)
    code := r.URL.Query().Get("code")
    if code == "" {
        http.Error(w, "Missing code", http.StatusBadRequest)
        return
    }
    // The session cookie simply stores the code as a placeholder.
    http.SetCookie(w, &http.Cookie{
        Name:     "session",
        Value:    code,
        Path:     "/",
        HttpOnly: true,
    })
    // Redirect to the main page.
    http.Redirect(w, r, "/", http.StatusFound)
}
