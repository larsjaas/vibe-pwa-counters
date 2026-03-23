package db

import (
    "database/sql"
    "fmt"
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
