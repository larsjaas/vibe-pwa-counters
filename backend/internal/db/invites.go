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

// TagInviteDetail provides detailed information about a tag invite, including tag name and other party email.
type TagInviteDetail struct {
	ID              int    `json:"id"`
	TagName         string `json:"tag_name"`
	OtherPartyEmail string `json:"other_party_email"`
	SenderID        int    `json:"sender_id"`
	AccessLevel     int    `json:"access_level"`
	IsSender        bool   `json:"is_sender"`
	Status          string `json:"status"`
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

// GetUserInvites retrieves all pending invites where the user is either the sender or the recipient.
func GetUserInvites(userID int, email string) ([]*TagInviteDetail, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	const query = `
		SELECT i.id, t.name,
		       CASE WHEN i.sender_id = $1 THEN i.email ELSE u.email END,
		       i.sender_id, i.access_level, i.status, (i.sender_id = $1)
		FROM tag_invites i
		JOIN tags t ON i.tag_id = t.id
		JOIN users u ON i.sender_id = u.id
		WHERE (i.email = $2 OR i.sender_id = $1) AND i.status = 'pending' AND i.expires_at > NOW()
		ORDER BY i.created_at DESC`

	rows, err := db.Query(query, userID, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	invites := make([]*TagInviteDetail, 0)
	for rows.Next() {
		var d TagInviteDetail
		err := rows.Scan(&d.ID, &d.TagName, &d.OtherPartyEmail, &d.SenderID, &d.AccessLevel, &d.Status, &d.IsSender)
		if err != nil {
			return nil, err
		}
		invites = append(invites, &d)
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
	// var notifiedAt, reminderSentAt sql.NullTime
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

func ProcessReminderInvites(sendEmail func(to, subject, body string) error) (int, error) {
	if db == nil {
		return 0, fmt.Errorf("database not initialized")
	}

	const query = `
		SELECT
			i.id, i.email,
			u_rec.id as recipient_id, u_rec.name as recipient_name,
			u_send.name as sender_name,
			t.name as tag_name
		FROM tag_invites i
		JOIN tags t ON i.tag_id = t.id
		JOIN users u_send ON i.sender_id = u_send.id
		LEFT JOIN users u_rec ON i.email = u_rec.email
		WHERE i.status = 'pending'
		  AND i.notified_at IS NOT NULL
		  AND i.reminder_sent_at IS NULL
		  AND i.expires_at > NOW()
		  AND i.created_at < NOW() - INTERVAL '48 hours'`
	
	rows, err := db.Query(query)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id int
		var email, recipientName, senderName, tagName string
		var recUserID sql.NullInt64
		if err := rows.Scan(&id, &email, &recUserID, &recipientName, &senderName, &tagName); err != nil {
			return count, err
		}

		shouldSend := false
		if !recUserID.Valid {
			// For non-users, we can decide if we send a reminder.
			// The prompt says "verify that tag_sharing_reminder is true for the user".
			// We'll assume we only send reminders to existing users.
			shouldSend = false
		} else {
			// User exists, check their preference for reminders
			enabled, err := GetUserSettingBool(int(recUserID.Int64), "tag_sharing_reminder", false)
			if err != nil {
				log.Printf("error checking reminder settings for user %d: %v", recUserID.Int64, err)
				continue
			}
			if enabled {
				shouldSend = true
			}
		}

		if shouldSend {
			subject := "Reminder: You have an invite to shared counters"
			
			salutation := "Hello,"
			if recUserID.Valid && recipientName != "" {
				salutation = fmt.Sprintf("Hello %s,", recipientName)
			}

			body := fmt.Sprintf(
				"<p>%s</p><p>This is a reminder that User %s has invited you to share the counters tagged '%s' on counters.crudbytes.com. Log in to your profile to accept or reject the invite, and maybe go to Account Settings if you want to alter your email preferences.</p><p>Best regards,<br>CrudBytes Apps &lt;Apps@CrudBytes.com&gt;</p>",
				salutation, senderName, tagName,
			)
			
			if err := sendEmail(email, subject, body); err != nil {
				log.Printf("failed to send reminder email to %s: %v", email, err)
				continue
			}
			
			if err := MarkInviteNotified(id, true, time.Time{}); err != nil {
				log.Printf("failed to mark invite %d as reminded: %v", id, err)
				continue
			}
			count++
		} else {
			// Mark as reminded with epoch to avoid future delivery if settings change
			if err := MarkInviteNotified(id, true, time.Unix(0, 0)); err != nil {
				log.Printf("failed to mark invite %d as handled (skipped reminder): %v", id, err)
			}
		}
	}
	return count, nil
}

// MarkInviteNotified updates the notification timestamp.
// If ts is zero (time.Time{}), it uses the current database time (NOW()).
func MarkInviteNotified(inviteID int, isReminder bool, ts time.Time) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	var query string
	var args []interface{}

	if isReminder {
		if ts.IsZero() {
			query = `UPDATE tag_invites SET reminder_sent_at = NOW() WHERE id = $1`
			args = append(args, inviteID)
		} else {
			query = `UPDATE tag_invites SET reminder_sent_at = $1 WHERE id = $2`
			args = append(args, ts, inviteID)
		}
	} else {
		if ts.IsZero() {
			query = `UPDATE tag_invites SET notified_at = NOW() WHERE id = $1`
			args = append(args, inviteID)
		} else {
			query = `UPDATE tag_invites SET notified_at = $1 WHERE id = $2`
			args = append(args, ts, inviteID)
		}
	}

	_, err := db.Exec(query, args...)
	return err
}

func ProcessInitialInvites(sendEmail func(to, subject, body string) error) (int, error) {
	if db == nil {
		return 0, fmt.Errorf("database not initialized")
	}

	const query = `
		SELECT
			i.id, i.email,
			u_rec.id as recipient_id, u_rec.name as recipient_name,
			u_send.name as sender_name,
			t.name as tag_name
		FROM tag_invites i
		JOIN tags t ON i.tag_id = t.id
		JOIN users u_send ON i.sender_id = u_send.id
		LEFT JOIN users u_rec ON i.email = u_rec.email
		WHERE i.status = 'pending'
		  AND i.notified_at IS NULL
		  AND i.expires_at > NOW()
		  AND i.created_at < NOW() - INTERVAL '15 minutes'`
	
	rows, err := db.Query(query)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var id int
		var email, recipientName, senderName, tagName string
		var recUserID sql.NullInt64
		if err := rows.Scan(&id, &email, &recUserID, &recipientName, &senderName, &tagName); err != nil {
			return count, err
		}

		shouldSend := false
		if !recUserID.Valid {
			// User doesn't exist, send invite to bring them in
			shouldSend = true
		} else {
			// User exists, check their preference for email notifications
			enabled, err := GetUserSettingBool(int(recUserID.Int64), "tag_sharing_email", false)
			if err != nil {
				log.Printf("error checking settings for user %d: %v", recUserID.Int64, err)
				continue
			}
			if enabled {
				shouldSend = true
			}
		}

		if shouldSend {
			subject := "You have an invite to shared counters"
			
			salutation := "Hello,"
			if recUserID.Valid && recipientName != "" {
				salutation = fmt.Sprintf("Hello %s,", recipientName)
			}

			body := fmt.Sprintf(
				"<p>%s</p><p>User %s has invited you to share the counters tagged '%s' on counters.crudbytes.com. Log in to your profile to accept or reject the invite, and maybe go to Account Settings if you want to alter your email preferences.</p><p>Best regards,<br>CrudBytes Apps &lt;Apps@CrudBytes.com&gt;</p>",
				salutation, senderName, tagName,
			)
			
			if err := sendEmail(email, subject, body); err != nil {
				log.Printf("failed to send invite email to %s: %v", email, err)
				continue
			}
			
			if err := MarkInviteNotified(id, false, time.Time{}); err != nil {
				log.Printf("failed to mark invite %d as notified: %v", id, err)
				continue
			}
			count++
		} else {
			// Mark as notified with epoch to avoid future delivery if settings change
			if err := MarkInviteNotified(id, false, time.Unix(0, 0)); err != nil {
				log.Printf("failed to mark invite %d as handled (skipped): %v", id, err)
			}
		}
	}
	return count, nil
}
func GetInviteByID(inviteID int) (*TagInvite, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	var i TagInvite
	var notifiedAt, reminderSentAt sql.NullTime
	const query = `
		SELECT id, tag_id, email, sender_id, access_level, status, created_at, expires_at, notified_at, reminder_sent_at
		FROM tag_invites
		WHERE id = $1`
	
	err := db.QueryRow(query, inviteID).Scan(
		&i.ID, &i.TagID, &i.Email, &i.SenderID, &i.AccessLevel, &i.Status, &i.CreatedAt, &i.ExpiresAt, &notifiedAt, &reminderSentAt,
	)
	if err != nil {
		return nil, err
	}
	if notifiedAt.Valid {
		i.NotifiedAt = &notifiedAt.Time
	}
	if reminderSentAt.Valid {
		i.ReminderSentAt = &reminderSentAt.Time
	}
	return &i, nil
}
