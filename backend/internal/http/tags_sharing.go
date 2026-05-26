package http

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	db "github.com/larsa/pwa-counter/backend/internal/db"
)

func ShareTag(w http.ResponseWriter, r *http.Request, userID int) {
	// Now tag sharing is based on an invite system.
	// We redirect this to CreateInvite logic.
	CreateInvite(w, r, userID)
}

func UnshareTag(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	email := r.PathValue("email")
	tagID, errT := strconv.Atoi(tagIDStr)
	if errT != nil {
		http.Error(w, "invalid tag ID", http.StatusBadRequest)
		return
	}

	var updated bool
	var err error
	targetUserID, userErr := db.GetUserIDByEmail(email)

	if userErr == nil {
		updated, err = db.UnshareTagFromUser(userID, tagID, targetUserID)
		if err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
	}

	if !updated {
		updated, err = db.RetractInviteByEmail(userID, tagID, email)
		if err != nil {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
	}

	if !updated {
		http.Error(w, "share or invite not found or unauthorized", http.StatusNotFound)
		return
	}

	PublishEvent(userID, "UPDATED TAG_SHARES")
	if userErr == nil {
		PublishEvent(targetUserID, "UPDATED TAG_SHARES")
		PublishEvent(targetUserID, "UPDATED COUNTERS")
	}
	w.WriteHeader(http.StatusOK)
}

func GetTagShares(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	tagID, err := strconv.Atoi(tagIDStr)
	if err != nil {
		http.Error(w, "invalid tag ID", http.StatusBadRequest)
		return
	}

	shares, err := db.GetTagShares(userID, tagID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	invites, err := db.GetPendingInvitesByTag(tagID)
	if err != nil {
		log.Printf("error fetching pending invites: %v", err)
		// We continue even if invites fail, as shares are the primary data
	}

	combined := make([]db.TagShareWithStatus, 0, len(shares)+len(invites))
	for _, s := range shares {
		combined = append(combined, *s)
	}
	for _, i := range invites {
		combined = append(combined, db.TagShareWithStatus{
			Email:       i.Email,
			AccessLevel: i.AccessLevel,
			Status:      "pending",
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(combined)
}

func GetUserTagShares(w http.ResponseWriter, r *http.Request, userID int) {
	shares, err := db.GetUserTagShares(userID)
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(shares)
}

func CreateInvite(w http.ResponseWriter, r *http.Request, userID int) {
	tagIDStr := r.PathValue("id")
	tagID, err := strconv.Atoi(tagIDStr)
	if err != nil {
		http.Error(w, "invalid tag ID", http.StatusBadRequest)
		return
	}

	var body struct {
		Email       string `json:"email"`
		AccessLevel int    `json:"access_level"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	if body.AccessLevel == 0 {
		body.AccessLevel = 2 // Default to Edit access
	}

	// Check if the recipient user exists and has disabled tag sharing.
	if targetUserID, err := db.GetUserIDByEmail(body.Email); err == nil {
		enabled, err := db.GetUserSettingBool(targetUserID, "tag_sharing", true)
		if err != nil {
			log.Printf("error checking sharing setting for user %d: %v", targetUserID, err)
		} else if !enabled {
			// User has explicitly disabled tag sharing.
			// We return 200 OK but don't create the invite.
			w.WriteHeader(http.StatusOK)
			return
		}
	}

	invite, err := db.CreateInvite(userID, tagID, body.Email, body.AccessLevel)
	if err != nil {
		http.Error(w, err.Error(), http.StatusForbidden)
		return
	}

	// Notify both parties about the new invite
	PublishEvent(userID, "UPDATED TAG_INVITES")
	if targetUserID, err := db.GetUserIDByEmail(body.Email); err == nil {
		PublishEvent(targetUserID, "UPDATED TAG_INVITES")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(invite)
}
