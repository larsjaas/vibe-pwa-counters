package http

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	db "github.com/larsa/pwa-counter/backend/internal/db"
)

// ListInvites returns invitations sent to the authenticated user.
func ListInvites(w http.ResponseWriter, r *http.Request, uid int) {
	user, err := db.GetUserByID(uid)
	if err != nil {
		log.Printf("ListInvites: GetUserByID failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	invites, err := db.GetUserInvites(uid, user.Email)
	if err != nil {
		log.Printf("ListInvites: GetUserInvites failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(invites); err != nil {
		log.Printf("ListInvites: JSON encode failed: %v", err)
	}
}

// AcceptInvite accepts a tag invitation.
func AcceptInvite(w http.ResponseWriter, r *http.Request, uid int) {
	inviteIDStr := r.PathValue("id")
	inviteID, err := strconv.Atoi(inviteIDStr)
	if err != nil {
		http.Error(w, "invalid invite ID", http.StatusBadRequest)
		return
	}

	err = db.AcceptInvite(uid, inviteID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	invite, err := db.GetInviteByID(inviteID)
	if err == nil {
		PublishEvent(uid, "UPDATED TAG_INVITES")
		PublishEvent(uid, "UPDATED TAG_SHARES")
		PublishEvent(invite.SenderID, "UPDATED TAG_INVITES")
		PublishEvent(invite.SenderID, "UPDATED TAG_SHARES")
	}

	w.WriteHeader(http.StatusOK)
}

// RejectInvite rejects a tag invitation.
func RejectInvite(w http.ResponseWriter, r *http.Request, uid int) {
	inviteIDStr := r.PathValue("id")
	inviteID, err := strconv.Atoi(inviteIDStr)
	if err != nil {
		http.Error(w, "invalid invite ID", http.StatusBadRequest)
		return
	}

	err = db.RejectInvite(uid, inviteID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	invite, err := db.GetInviteByID(inviteID)
	if err == nil {
		PublishEvent(uid, "UPDATED TAG_INVITES")
		PublishEvent(invite.SenderID, "UPDATED TAG_INVITES")
	}

	w.WriteHeader(http.StatusOK)
}

// RetractInvite retracts a sent tag invitation.
func RetractInvite(w http.ResponseWriter, r *http.Request, uid int) {
	inviteIDStr := r.PathValue("id")
	inviteID, err := strconv.Atoi(inviteIDStr)
	if err != nil {
		http.Error(w, "invalid invite ID", http.StatusBadRequest)
		return
	}

	err = db.RetractInvite(uid, inviteID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	invite, err := db.GetInviteByID(inviteID)
	if err == nil {
		PublishEvent(uid, "UPDATED TAG_INVITES")
		if targetUserID, err := db.GetUserIDByEmail(invite.Email); err == nil {
			PublishEvent(targetUserID, "UPDATED TAG_INVITES")
		}
	}

	w.WriteHeader(http.StatusOK)
}
