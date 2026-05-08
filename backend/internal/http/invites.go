package http

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	db "github.com/larsa/pwa-counter/backend/internal/db"
)

// InvitesHandler handles requests for tag invitation management.
// It maps to /api/invites and /api/invites/:id
func InvitesHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("/api/invites called: method=%s path=%s", r.Method, r.URL.Path)

	sess, err := AuthenticateRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	userID := sess.UserID

	// Get the user's email for verification
	user, err := db.GetUserByID(userID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	userEmail := user.Email

	path := r.URL.Path
	method := r.Method

	// Handle /api/invites
	if path == "/api/invites" || path == "/api/invites/" {
		switch method {
		case http.MethodGet:
			handleListInvites(w, r, userEmail)
		default:
			http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		}
		return
	}

	// Handle /api/invites/:id
	if strings.HasPrefix(path, "/api/invites/") {
		parts := strings.Split(strings.TrimPrefix(path, "/api/invites/"), "/")
		if len(parts) == 0 || parts[0] == "" {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}

		inviteID, err := strconv.Atoi(parts[0])
		if err != nil {
			http.Error(w, "invalid invite ID", http.StatusBadRequest)
			return
		}

		// Case: /api/invites/:id/accept
		if len(parts) == 2 && parts[1] == "accept" {
			switch method {
			case http.MethodPost:
				handleAcceptInvite(w, r, userID, inviteID)
			default:
				http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		// Case: /api/invites/:id/reject
		if len(parts) == 2 && parts[1] == "reject" {
			switch method {
			case http.MethodPost:
				handleRejectInvite(w, r, userID, inviteID)
			default:
				http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		// Case: /api/invites/:id
		if len(parts) == 1 {
			switch method {
			case http.MethodDelete:
				handleRetractInvite(w, r, userID, inviteID)
			default:
				http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
			}
			return
		}

		http.Error(w, "Not Found", http.StatusNotFound)
	} else {
		http.Error(w, "Not Found", http.StatusNotFound)
	}
}

func handleListInvites(w http.ResponseWriter, r *http.Request, email string) {
	userID, err := db.GetUserIDByEmail(email)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	invites, err := db.GetUserInvites(userID, email)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(invites)
}

func handleAcceptInvite(w http.ResponseWriter, r *http.Request, userID int, inviteID int) {
	err := db.AcceptInvite(userID, inviteID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	invite, err := db.GetInviteByID(inviteID)
	if err == nil {
		PublishEvent(userID, "UPDATED TAG_INVITES")
		PublishEvent(userID, "UPDATED TAG_SHARES")
		PublishEvent(invite.SenderID, "UPDATED TAG_INVITES")
		PublishEvent(invite.SenderID, "UPDATED TAG_SHARES")
	}

	w.WriteHeader(http.StatusOK)
}

func handleRejectInvite(w http.ResponseWriter, r *http.Request, userID int, inviteID int) {
	err := db.RejectInvite(userID, inviteID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	invite, err := db.GetInviteByID(inviteID)
	if err == nil {
		PublishEvent(userID, "UPDATED TAG_INVITES")
		PublishEvent(invite.SenderID, "UPDATED TAG_INVITES")
	}

	w.WriteHeader(http.StatusOK)
}

func handleRetractInvite(w http.ResponseWriter, r *http.Request, userID int, inviteID int) {
	err := db.RetractInvite(userID, inviteID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	invite, err := db.GetInviteByID(inviteID)
	if err == nil {
		PublishEvent(userID, "UPDATED TAG_INVITES")
		if targetUserID, err := db.GetUserIDByEmail(invite.Email); err == nil {
			PublishEvent(targetUserID, "UPDATED TAG_INVITES")
		}
	}

	w.WriteHeader(http.StatusOK)
}
