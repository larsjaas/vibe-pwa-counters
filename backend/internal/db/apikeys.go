package db

import (
	"database/sql"
	"fmt"
	"time"
)

type APIKey struct {
	ID         int            `json:"id"`
	UserID     int            `json:"user_id"`
	APIKey     string         `json:"apikey"`
	CreateTime time.Time      `json:"createtime"`
	DeleteTime sql.NullTime   `json:"deletetime"`
	LastUsed   sql.NullTime   `json:"lastused"`
}

func GetAPIKeysForUser(userID int) ([]*APIKey, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	const query = `SELECT id, userid, apikey, createtime, deletetime, lastused 
                   FROM apikeys 
                   WHERE userid = $1 AND deletetime IS NULL`
	rows, err := db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := make([]*APIKey, 0)
	for rows.Next() {
		var k APIKey
		if err := rows.Scan(&k.ID, &k.UserID, &k.APIKey, &k.CreateTime, &k.DeleteTime, &k.LastUsed); err != nil {
			return nil, err
		}
		keys = append(keys, &k)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return keys, nil
}

func CreateAPIKey(userID int, key string) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	const query = `INSERT INTO apikeys (userid, apikey) VALUES ($1, $2)`
	_, err := db.Exec(query, userID, key)
	return err
}

func SoftDeleteAPIKey(userID, keyID int) (bool, error) {
	if db == nil {
		return false, fmt.Errorf("database not initialized")
	}
	const query = `UPDATE apikeys SET deletetime = NOW() 
                   WHERE id = $1 AND userid = $2 AND deletetime IS NULL`
	res, err := db.Exec(query, keyID, userID)
	if err != nil {
		return false, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows > 0, nil
}

func SoftDeleteAllAPIKeysForUser(userID int) error {
	if db == nil {
		return fmt.Errorf("database not initialized")
	}
	const query = `UPDATE apikeys SET deletetime = NOW() 
                   WHERE userid = $1 AND deletetime IS NULL`
	_, err := db.Exec(query, userID)
	return err
}

// GetUserIDByAPIKey looks up the userID associated with the given API key,
// ensuring the key has not been soft-deleted.
func GetUserIDByAPIKey(key string) (int, error) {
	if db == nil {
		return 0, fmt.Errorf("database not initialized")
	}
	const query = `SELECT userid FROM apikeys WHERE apikey = $1 AND deletetime IS NULL`
	var userID int
	err := db.QueryRow(query, key).Scan(&userID)
	if err == sql.ErrNoRows {
		return 0, fmt.Errorf("invalid or deleted API key")
	}
	if err != nil {
		return 0, err
	}
	return userID, nil
}
