package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

func main() {
	server := os.Getenv("TALLY_SERVER")
	apiKey := os.Getenv("TALLY_API_KEY")

	if server == "" || apiKey == "" {
		fmt.Fprintln(os.Stderr, "TALLY_SERVER and TALLY_API_KEY environment variables are required")
		os.Exit(1)
	}

	req, err := http.NewRequest(http.MethodGet, server+"/api/account", nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to create request: %v\n", err)
		os.Exit(1)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "request failed: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Fprintf(os.Stderr, "server returned status %d\n", resp.StatusCode)
		os.Exit(1)
	}

	var account struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&account); err != nil {
		fmt.Fprintf(os.Stderr, "failed to decode response: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Name:  %s\n", account.Name)
	fmt.Printf("Email: %s\n", account.Email)
}
