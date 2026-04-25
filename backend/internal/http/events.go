package http

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
)

// sessionUser represents the session data stored in Redis.
type sessionUser struct {
	UserID int `json:"user_id"`
}

var (
	// userConnections maps userID to a slice of active event channels.
	userConnections = make(map[int][]chan string)
	connMutex       sync.RWMutex
)

// getSessionUserID retrieves the userID from the session cookie.
func getSessionUserID(r *http.Request) (int, error) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return 0, fmt.Errorf("no session cookie")
	}
	if redisClient == nil {
		return 0, fmt.Errorf("redis client not initialized")
	}

	val, err := redisClient.Get(context.Background(), cookie.Value).Result()
	if err != nil {
		return 0, fmt.Errorf("session not found or expired")
	}

	var session sessionUser
	if err := json.Unmarshal([]byte(val), &session); err != nil {
		return 0, fmt.Errorf("failed to decode session")
	}

	return session.UserID, nil
}

// EventsHandler handles the SSE connection for the authenticated user.
func EventsHandler(w http.ResponseWriter, r *http.Request) {
	userID, err := getSessionUserID(r)
	if err != nil {
		log.Printf("SSE auth failed: %v", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Create a channel for this specific connection
	eventChan := make(chan string, 10)

	// Register the connection
	connMutex.Lock()
	userConnections[userID] = append(userConnections[userID], eventChan)
	connMutex.Unlock()

	log.Printf("SSE connection established for user %d", userID)

	// Ensure deregistration on exit
	defer func() {
		connMutex.Lock()
		conns := userConnections[userID]
		for i, ch := range conns {
			if ch == eventChan {
				userConnections[userID] = append(conns[:i], conns[i+1:]...)
				break
			}
		}
		if len(userConnections[userID]) == 0 {
			delete(userConnections, userID)
		}
		connMutex.Unlock()
		close(eventChan)
		log.Printf("SSE connection closed for user %d", userID)
	}()

	// Flush the initial response to establish the connection
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}
	flusher.Flush()

	// Listen for events or connection close
	for {
		select {
		case event := <-eventChan:
			_, err := fmt.Fprintf(w, "data: %s\n\n", event)
			if err != nil {
				return
			}
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}

// PublishEvent sends a string event to all active SSE connections for the given userID.
func PublishEvent(userID int, event string) {
	connMutex.RLock()
	conns, ok := userConnections[userID]
	connMutex.RUnlock()

	if !ok {
		return
	}

	for _, ch := range conns {
		select {
		case ch <- event:
		default:
			// Buffer full, drop event for this specific connection
		}
	}
}
