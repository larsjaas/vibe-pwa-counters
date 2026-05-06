package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

// TagInvite represents a row in the `tag_invites` table.
type TagInvite struct {
	ID             int        `json:"id"`
	TagID          int        `json:"tag_id"`
	Email          string     `json:"email"`
	SenderID       int        `json:"sender_id"`
	AccessLevel    int        `json:"access_level"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
	ExpiresAt      time.Time  `json:"expires_at"`
	NotifiedAt     *time.Time `json:"notified_at"`
	ReminderSentAt *time.Time `json:"reminder_sent_at"`
}

// CreateInvite creates a new invite for a tag.
func CreateInvite(senderID int, tagID int, email string, accessLevel int) (*TagInvite, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	// Verify tag ownership
	const checkQuery = `SELECT 1 FROM tags WHERE id = $1 AND user_id = $2 AND deletetime IS NULL`
	var exists int
	err := db.QueryRow(checkQuery, tagID, senderID).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("tag not found or not owned by user: %w", err)
	}

	expiresAt := time.Now().AddDate(0, 0, 14) // Expire in 2 weeks

	const query = `
		INSERT INTO tag_invites (tag_id, email, sender_id, access_level, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, tag_id, email, sender_id, access_level, status, created_at, expires_at`
	
	var i TagInvite
	err = db.QueryRow(query, tagID, email, senderID, accessLevel, expiresAt).Scan(
		&i.ID, &i.TagID, &i.Email, &i.SenderID, &i.AccessLevel, &i.Status, &i.CreatedAt, &i.ExpiresAt,
	)
	if err != nil {
		return nil, err
	}
	return &i, nil
}

// GetPendingInvites retrieves all pending and non-expired invites for a specific email.
func GetPendingInvites(email string) ([]*TagInvite, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	const query = `
		SELECT id, tag_id, email, sender_id, access_level, status, created_at, expires_at, notified_at, reminder_sent_at
		FROM tag_invites
		WHERE email = $1 AND status = 'pending' AND expires_at > NOW()
		ORDER BY created_at DESC`
	
	rows, err := db.Query(query, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	invites := make([]*TagInvite, 0)
	for rows.Next() {
		var i TagInvite
		var notifiedAt, reminderSentAt sql.NullTime
		err := rows.Scan(&i.ID, &i.TagID, &i.Email, &i.SenderID, &i.AccessLevel, &i.Status, &i.CreatedAt, &i.ExpiresAt, &notifiedAt, &reminderSentAt)
		if err != nil {
			return nil, err
		}
		if notifiedAt.Valid {
			i.NotifiedAt = &notifiedAt.Time
		}
		if reminderSentAt.Valid {
			i.ReminderSentAt = &reminderSentAt.Time
		}
		invites = append(invites, &i)
	}
	return invites, nil
}

// AcceptInvite accepts an invite and creates the share.
func AcceptInvite(userID int, inviteID int) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	// Verify the user matches the invite email and the invite is pending
	var invite TagInvite
	var notifiedAt, reminderSentAt sql.NullTime
	const inviteQuery = `
		SELECT id, tag_id, email, access_level, status 
		FROM tag_invites 
		WHERE id = $1 AND status = 'pending' AND expires_at > NOW()`
	
	err := db.QueryRow(inviteQuery, inviteID).Scan(&invite.ID, &invite.TagID, &invite.Email, &invite.AccessLevel, &invite.Status)
	if err != nil {
		return fmt.Errorf("invite not found or expired: %w", err)
	}

	var userEmail string
	const userQuery = `SELECT email FROM users WHERE id = $1`
	err = db.QueryRow(userQuery, userID).Scan(&userEmail)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if userEmail != invite.Email {
		return fmt.Errorf("invite is not for this user")
	}

	// Transaction to accept invite and create share
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	const updateInviteQuery = `UPDATE tag_invites SET status = 'accepted' WHERE id = $1`
	_, err = tx.Exec(updateInviteQuery, inviteID)
	if err != nil {
		return err
	}

	const createShareQuery = `INSERT INTO tag_shares (tag_id, user_id, access_level) VALUES ($1, $2, $3) 
	                          ON CONFLICT (tag_id, user_id) DO UPDATE SET access_level = EXCLUDED.access_level`
	_, err = tx.Exec(createShareQuery, invite.TagID, userID, invite.AccessLevel)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// RejectInvite rejects an invite.
func RejectInvite(userID int, inviteID int) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	// Verify user email matches invite email
	var inviteEmail string
	const inviteQuery = `SELECT email FROM tag_invites WHERE id = $1 AND status = 'pending'`
	err := db.QueryRow(inviteQuery, inviteID).Scan(&inviteEmail)
	if err != nil {
		return fmt.Errorf("invite not found: %w", err)
	}

	var userEmail string
	const userQuery = `SELECT email FROM users WHERE id = $1`
	err = db.QueryRow(userQuery, userID).Scan(&userEmail)
	if err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	if userEmail != inviteEmail {
		return fmt.Errorf("invite is not for this user")
	}

	const updateQuery = `UPDATE tag_invites SET status = 'rejected' WHERE id = $1`
	_, err = db.Exec(updateQuery, inviteID)
	return err
}

// RetractInvite retracts an invite.
func RetractInvite(senderID int, inviteID int) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	const updateQuery = `UPDATE tag_invites SET status = 'retracted' WHERE id = $1 AND sender_id = $2 AND status = 'pending'`
	res, err := db.Exec(updateQuery, inviteID, senderID)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("invite not found or already responded to")
	}
	return nil
}

func ProcessPendingInvites() (int, error) {
	if db == nil {
		return 0, fmt.Errorf("database not initialized")
	}

	// Find invites that:
	// 1. Are pending
	// 2. Have been notified initially
	// 3. Have NOT been reminded yet
	// 4. Are NOT expired
	// 5. Were created more than 7 days ago
	const query = `
		SELECT id FROM tag_invites 
		WHERE status = 'pending' 
		  AND notified_at IS NOT NULL 
		  AND reminder_sent_at IS NULL 
		  AND expires_at > NOW() 
		  AND created_at < NOW() - INTERVAL '7 days'`
	
	rows, err := db.Query(query)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return count, err
		}
		// In a real system, we would send the reminder email here.
		err := MarkInviteNotified(id, true)
		if err != nil {
			log.Printf("failed to mark invite %d as reminded: %v", id, err)
			continue
		}
		count++
	}
	return count, nil
}

// MarkInviteNotified updates the notification timestamp.
func MarkInviteNotified(inviteID int, isReminder bool) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	var query string
	if isReminder {
		query = `UPDATE tag_invites SET reminder_sent_at = NOW() WHERE id = $1`
	} else {
		query = `UPDATE tag_invites SET notified_at = NOW() WHERE id = $1`
	}

	_, err := db.Exec(query, inviteID)
	return err
}
