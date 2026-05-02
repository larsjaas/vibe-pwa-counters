package db

import (
	"database/sql"
	"fmt"
	"time"
)

// Tag represents a row in the `tags` table.
type Tag struct {
	ID         int        `json:"id"`
	UserID     int        `json:"user_id"`
	Name       string     `json:"name"`
	CreateTime time.Time  `json:"createtime"`
	DeleteTime *time.Time `json:"deletetime"`
}

// TagShare represents a sharing record for a tag.
type TagShare struct {
	Email       string `json:"email"`
	AccessLevel int    `json:"access_level"`
}

// InsertTag creates a new tag for the given user.
func InsertTag(userID int, name string) (*Tag, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	const query = `INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING id, user_id, name, createtime`
	var t Tag
	err := db.QueryRow(query, userID, name).Scan(&t.ID, &t.UserID, &t.Name, &t.CreateTime)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// GetTagsForUser retrieves all tags that the user owns or that have been shared with them.
func GetTagsForUser(userID int) ([]*Tag, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	const query = `
		SELECT DISTINCT t.id, t.user_id, t.name, t.createtime, t.deletetime
		FROM tags t
		LEFT JOIN tag_shares ts ON t.id = ts.tag_id
		WHERE (t.user_id = $1 OR ts.user_id = $1) AND t.deletetime IS NULL
		ORDER BY t.name`
	rows, err := db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tags := make([]*Tag, 0)
	for rows.Next() {
		var t Tag
		var deleteTime sql.NullTime
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.CreateTime, &deleteTime); err != nil {
			return nil, err
		}
		if deleteTime.Valid {
			t.DeleteTime = &deleteTime.Time
		}
		tags = append(tags, &t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return tags, nil
}

// UpdateTag updates the name of a tag. Only the owner can update it.
func UpdateTag(userID int, tagID int, name string) (bool, error) {
	if db == nil {
		return false, fmt.Errorf("database not initialized")
	}
	const query = `UPDATE tags SET name = $1 WHERE id = $2 AND user_id = $3 AND deletetime IS NULL`
	res, err := db.Exec(query, name, tagID, userID)
	if err != nil {
		return false, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows > 0, nil
}

// SoftDeleteTag marks a tag as deleted. Only the owner can delete it.
func SoftDeleteTag(userID int, tagID int) (bool, error) {
	if db == nil {
		return false, fmt.Errorf("database not initialized")
	}
	const query = `UPDATE tags SET deletetime = NOW() WHERE id = $1 AND user_id = $2 AND deletetime IS NULL`
	res, err := db.Exec(query, tagID, userID)
	if err != nil {
		return false, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows > 0, nil
}

// AddTagToCounter associates a tag with a counter. 
// Requires that the user owns BOTH the tag and the counter.
func AddTagToCounter(userID int, tagID int, counterID int) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}

	// Verify tag ownership
	const checkTagQuery = `SELECT 1 FROM tags WHERE id = $1 AND user_id = $2 AND deletetime IS NULL`
	var tagExists int
	err := db.QueryRow(checkTagQuery, tagID, userID).Scan(&tagExists)
	if err != nil {
		return fmt.Errorf("tag not found or not owned by user: %w", err)
	}

	// Verify counter ownership
	const checkCounterQuery = `SELECT 1 FROM counters WHERE id = $1 AND "user" = $2 AND deletetime IS NULL`
	var counterExists int
	err = db.QueryRow(checkCounterQuery, counterID, userID).Scan(&counterExists)
	if err != nil {
		return fmt.Errorf("counter not found or not owned by user: %w", err)
	}

	const insertQuery = `INSERT INTO counter_tags (counter_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`
	_, err = db.Exec(insertQuery, counterID, tagID)
	return err
}

// RemoveTagFromCounter dissociates a tag from a counter.
func RemoveTagFromCounter(userID int, tagID int, counterID int) (bool, error) {
	if db == nil {
		return false, fmt.Errorf("database not initialized")
	}

	// Only tag owner can remove tags from counters
	const query = `DELETE FROM counter_tags WHERE tag_id = $1 AND counter_id = $2 
	               AND EXISTS (SELECT 1 FROM tags WHERE id = $1 AND user_id = $3)`
	res, err := db.Exec(query, tagID, counterID, userID)
	if err != nil {
		return false, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows > 0, nil
}

// ShareTagWithUser shares a tag with another user. Only the owner can share.
func ShareTagWithUser(ownerID int, tagID int, targetUserID int, accessLevel int) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	const query = `INSERT INTO tag_shares (tag_id, user_id, access_level) VALUES ($1, $2, $3) 
	               ON CONFLICT (tag_id, user_id) DO UPDATE SET access_level = EXCLUDED.access_level`
	// We should verify ownership first
	const checkQuery = `SELECT 1 FROM tags WHERE id = $1 AND user_id = $2 AND deletetime IS NULL`
	var exists int
	err := db.QueryRow(checkQuery, tagID, ownerID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("tag not found or not owned by user: %w", err)
	}

	_, err = db.Exec(query, tagID, targetUserID, accessLevel)
	return err
}

// UnshareTagFromUser removes shared access to a tag.
func UnshareTagFromUser(ownerID int, tagID int, targetUserID int) (bool, error) {
	if db == nil {
		return false, fmt.Errorf("database not initialized")
	}
	const query = `DELETE FROM tag_shares WHERE tag_id = $1 AND user_id = $2 
	               AND EXISTS (SELECT 1 FROM tags WHERE id = $1 AND user_id = $3)`
	res, err := db.Exec(query, tagID, targetUserID, ownerID)
	if err != nil {
		return false, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows > 0, nil
}

// GetTagsForCounter retrieves all tags associated with a counter.
func GetTagsForCounter(userID int, counterID int) ([]*Tag, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	// The user must have access to the counter (own or shared) to see its tags
	const checkCounterQuery = `
		SELECT 1 FROM counters c
		LEFT JOIN counter_tags ct ON c.id = ct.counter_id
		LEFT JOIN tags t ON ct.tag_id = t.id
		LEFT JOIN tag_shares ts ON t.id = ts.tag_id
		WHERE c.id = $1 AND (c."user" = $2 OR t.user_id = $2 OR ts.user_id = $2) AND c.deletetime IS NULL`
	var exists int
	err := db.QueryRow(checkCounterQuery, counterID, userID).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("counter not found or access denied: %w", err)
	}

	const query = `
		SELECT t.id, t.user_id, t.name, t.createtime, t.deletetime
		FROM tags t
		JOIN counter_tags ct ON t.id = ct.tag_id
		WHERE ct.counter_id = $1 AND t.deletetime IS NULL`
	rows, err := db.Query(query, counterID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tags := make([]*Tag, 0)
	for rows.Next() {
		var t Tag
		var deleteTime sql.NullTime
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.CreateTime, &deleteTime); err != nil {
			return nil, err
		}
		if deleteTime.Valid {
			t.DeleteTime = &deleteTime.Time
		}
		tags = append(tags, &t)
	}
	return tags, nil
}

// GetTagShares retrieves all users who have access to a tag.
// Only the tag owner can call this.
func GetTagShares(ownerID int, tagID int) ([]*TagShare, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}

	const query = `
		SELECT u.email, ts.access_level FROM users u
		JOIN tag_shares ts ON u.id = ts.user_id
		WHERE ts.tag_id = $1 
		  AND EXISTS (SELECT 1 FROM tags WHERE id = $1 AND user_id = $2)
		ORDER BY u.email`
	rows, err := db.Query(query, tagID, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	shares := make([]*TagShare, 0)
	for rows.Next() {
		var s TagShare
		if err := rows.Scan(&s.Email, &s.AccessLevel); err != nil {
			return nil, err
		}
		shares = append(shares, &s)
	}
	return shares, nil
}
