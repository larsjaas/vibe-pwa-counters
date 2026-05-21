package db

import (
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

func setupTestDB(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL environment variable not set, skipping integration test")
	}

	conn, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	if err := conn.Ping(); err != nil {
		t.Fatalf("Failed to ping test database: %v", err)
	}

	SetDB(conn)

	// Note: We assume the test database is already migrated.
	// In a full CI environment, we would run RunMigrations(conn) here,
	// but that requires adjusting the migration path relative to the test file.
	RunMigrations(conn, "file://./../../migrations")
}

func teardownTestDB(conn *sql.DB) {
	conn.Close()
}

func TestUserOperations(t *testing.T) {
	setupTestDB(t)
	testConn := GetDB()
	defer teardownTestDB(testConn)

	email := "test_user_integration@example.com"
	name := "Integration Test User"

	// Cleanup any existing user with this email before starting
	_, _ = testConn.Exec("DELETE FROM users WHERE email = $1", email)

	t.Run("AddUserAndGetUserID", func(t *testing.T) {
		row, err := AddUser(email, name)
		if err != nil {
			t.Fatalf("AddUser failed: %v", err)
		}

		var id int
		if err := row.Scan(&id); err != nil {
			t.Fatalf("Failed to scan id from AddUser result: %v", err)
		}

		if id <= 0 {
			t.Errorf("Expected positive user ID, got %d", id)
		}

		gotID, err := GetUserIDByEmail(email)
		if err != nil {
			t.Fatalf("GetUserIDByEmail failed: %v", err)
		}

		if gotID != id {
			t.Errorf("Expected ID %d, got %d", id, gotID)
		}
	})

	t.Run("UserExists", func(t *testing.T) {
		exists, err := UserExists(email)
		if err != nil {
			t.Fatalf("UserExists failed: %v", err)
		}
		if !exists {
			t.Error("Expected user to exist")
		}

		exists, err = UserExists("nonexistent_user@example.com")
		if err != nil {
			t.Fatalf("UserExists failed: %v", err)
		}
		if exists {
			t.Error("Expected user to not exist")
		}
	})

	t.Run("GetUserByID", func(t *testing.T) {
		id, _ := GetUserIDByEmail(email)
		user, err := GetUserByID(id)
		if err != nil {
			t.Fatalf("GetUserByID failed: %v", err)
		}

		if user.Email != email {
			t.Errorf("Expected email %s, got %s", email, user.Email)
		}
		if user.Name != name {
			t.Errorf("Expected name %s, got %s", name, user.Name)
		}
	})

	t.Run("AnonymizeUser", func(t *testing.T) {
		err := AnonymizeUser(email)
		if err != nil {
			t.Fatalf("AnonymizeUser failed: %v", err)
		}

		exists, err := UserExists(email)
		if err != nil {
			t.Fatalf("UserExists failed: %v", err)
		}
		if exists {
			t.Error("Expected user email to be anonymized/removed")
		}

		// Verify that a user was actually marked as deleted
		// Since we don't know the hashed email, we check the count of deleted users
		// but a better way is to check if any user has 'DELETED' as name
		var deletedExists int
		err = testConn.QueryRow("SELECT 1 FROM users WHERE name = 'DELETED' AND deletetime IS NOT NULL").Scan(&deletedExists)
		if err != nil {
			t.Errorf("Expected to find a deleted user record, but got error: %v", err)
		}
	})
}
