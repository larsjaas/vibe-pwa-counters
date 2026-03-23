package db

// This file holds a package‑level reference to the database connection
// that is created by the top‑level server executable. The reference is
// set using `SetDB` after the connection has been opened.

import "database/sql"

var db *sql.DB

// SetDB registers the global database handle for use by other packages.
func SetDB(conn *sql.DB) {
    db = conn
}

// GetDB returns the registered database handle. Callers are expected to
// check for a nil return value and handle the error accordingly.
func GetDB() *sql.DB {
    return db
}
