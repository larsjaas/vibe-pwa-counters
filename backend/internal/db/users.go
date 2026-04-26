package db

import (
	"database/sql"
	"fmt"
	"crypto/sha256"
	"encoding/hex"
	"time"
)

// UserExists checks whether a user with the supplied email address is
// already present in the `users` table. It returns true if the user
// exists, false otherwise, and an error if the query fails.
func UserExists(email string) (bool, error) {
    if db == nil {
        return false, fmt.Errorf("database not initialized")
    }
    const query = "SELECT 1 FROM users WHERE email=$1 LIMIT 1"
    var exists int
    err := db.QueryRow(query, email).Scan(&exists)
    if err == sql.ErrNoRows {
        return false, nil
    }
    if err != nil {
        return false, err
    }
    return true, nil
}

// AddUser inserts a new user record with the supplied email and name.
// The `name` argument is optional; if empty the database default of an
// empty string is stored.
func AddUser(email, name string) (*sql.Row, error) {
    if db == nil {
        return nil, fmt.Errorf("database not initialized")
    }
    const query = "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id"
    var id int
    err := db.QueryRow(query, email, name).Scan(&id)
    if err != nil {
        return nil, err
    }
    return db.QueryRow("SELECT id FROM users WHERE id=$1", id), nil
}

// GetUserIDByEmail looks up the users table for a record matching
// the supplied email address. It returns the numeric `id` if the
// user exists, otherwise it returns 0 and an error. If the query
// succeeds but finds no rows the returned error will be
// `sql.ErrNoRows`. The caller can decide whether to treat that as
// a missing user or a failure.
func GetUserIDByEmail(email string) (int, error) {
    if db == nil {
        return 0, fmt.Errorf("database not initialized")
    }
    const query = "SELECT id FROM users WHERE email=$1"
    var id int
    err := db.QueryRow(query, email).Scan(&id)
    if err == sql.ErrNoRows {
        return 0, err
    }
    if err != nil {
        return 0, err
    }
    return id, nil
}

// UpdateLastLogin updates the lastlogin timestamp for the user with the given id.
func UpdateLastLogin(userID int) error {
    if db == nil {
        return fmt.Errorf("database not initialized")
    }
    const query = "UPDATE users SET lastlogin = NOW() WHERE id = $1"
    _, err := db.Exec(query, userID)
    return err
}

// AnonymizeUser marks a user as deleted by updating their name,
// setting the deletetime, and replacing their email with a hashed version
// to prevent the original email from being recovered while maintaining 
// record uniqueness.
func AnonymizeUser(email string) error {
    if db == nil {
        return fmt.Errorf("database not initialized")
    }

    // Calculate secure one-way hash of the email
    hash := sha256.Sum256([]byte(email))
    emailHash := hex.EncodeToString(hash[:])
    
    // Format: DELETED_<emailhash>_<isodatetime>
    timestamp := time.Now().UTC().Format(time.RFC3339)
    newEmail := fmt.Sprintf("DELETED_%s_%s", emailHash, timestamp)

    const query = `
        UPDATE users 
        SET email = $1, name = 'DELETED', deletetime = NOW() 
        WHERE email = $2`
    
    _, err := db.Exec(query, newEmail, email)
    return err
}
