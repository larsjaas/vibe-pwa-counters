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
func ShareTagWithUser(ownerID int, tagID int, targetUserID int) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	const query = `INSERT INTO tag_shares (tag_id, user_id) VALUES ($1, $2) 
	               ON CONFLICT DO NOTHING`
	// We should verify ownership first
	const checkQuery = `SELECT 1 FROM tags WHERE id = $1 AND user_id = $2 AND deletetime IS NULL`
	var exists int
	err := db.QueryRow(checkQuery, tagID, ownerID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("tag not found or not owned by user: %w", err)
	}

	_, err = db.Exec(query, tagID, targetUserID)
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
