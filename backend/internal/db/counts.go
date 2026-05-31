package db

import (
	"database/sql"
	"fmt"
	"time"
)

// GetCountsTotal returns the total number of count records in the table.
func GetCountsTotal() (int, error) {
	if db == nil {
		return 0, fmt.Errorf("database not initialized")
	}
	const query = "SELECT count(*) FROM counts"
	var count int
	err := db.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// GetCountsDeletedTotal returns the number of soft-deleted count records.
func GetCountsDeletedTotal() (int, error) {
	if db == nil {
		return 0, fmt.Errorf("database not initialized")
	}
	const query = "SELECT count(*) FROM counts WHERE deletetime IS NOT NULL"
	var count int
	err := db.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

// Count represents a row in the `counts` table.
type Count struct {
    ID         int            `json:"id"`
    CounterID  int            `json:"counter"`
    UserID     int            `json:"user_id"`
    Delta      int            `json:"delta"`
    Operation  string         `json:"operation"`
    When       time.Time      `json:"when"`
    DeleteTime sql.NullTime   `json:"deletetime"`
}

// GetCounterIDForCount retrieves the counter ID for a given count record.
func GetCounterIDForCount(countID int) (int, error) {
	if db == nil {
		return 0, fmt.Errorf("database not initialized")
	}
	const query = `SELECT "counter" FROM counts WHERE id = $1`
	var counterID int
	err := db.QueryRow(query, countID).Scan(&counterID)
	if err != nil {
		return 0, err
	}
	return counterID, nil
}

// InsertCount creates a new row in the count table for the supplied
// counter, user, delta and operation. Supported operations are:
//   "count"  – normal increment/decrement
//   "reset"  – reset the running count to zero (delta must be 0)
//   "punt"   – defer a repeating task without changing the count (delta must be 0)
// If the delta is positive and the counter is of type 'repeating', it also
// updates the last_performed_at timestamp.  A punt also bumps
// last_performed_at for repeating counters.  It returns the full Count
// struct with the newly generated ID and timestamp.
func InsertCount(counterID int, userID int, delta int, operation string) (*Count, error) {
    if db == nil {
        return nil, fmt.Errorf("database not initialized")
    }

    // Validate operation
    switch operation {
    case "count", "reset", "punt", "init":
        // valid
    default:
        operation = "count"
    }

    tx, err := db.Begin()
    if err != nil {
        return nil, err
    }
    defer tx.Rollback()

    const query = `INSERT INTO counts ("counter", user_id, delta, operation) VALUES ($1, $2, $3, $4)
        RETURNING id, "counter", user_id, delta, operation, "when", deletetime`
    var c Count
    var del int
    var uid int
    var op string
    var when time.Time
    var deleteTime sql.NullTime
    err = tx.QueryRow(query, counterID, userID, delta, operation).Scan(&c.ID, &c.CounterID, &uid, &del, &op, &when, &deleteTime)
    if err != nil {
        return nil, err
    }

    // Bump last_performed_at for positive counts or punts
    if (delta > 0 && operation == "count") || operation == "punt" {
        const updateQuery = `UPDATE counters SET last_performed_at = now() WHERE id = $1 AND type = 'repeating'`
        _, err = tx.Exec(updateQuery, counterID)
        if err != nil {
            return nil, err
        }
    }

    if err := tx.Commit(); err != nil {
        return nil, err
    }

    c.CounterID = counterID
    c.UserID = uid
    c.Delta = del
    c.Operation = op
    c.When = when
    c.DeleteTime = deleteTime
    return &c, nil
}

// GetCountsForUser retrieves all count records for counters the user owns or has access to via shared tags.
func GetCountsForUser(userID int) ([]*Count, error) {
	if db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	const query = `
		SELECT DISTINCT c.id, c.counter, c.user_id, c.delta, c.operation, c.when, c.deletetime
		FROM counts c
		JOIN counters ct ON c.counter = ct.id
		LEFT JOIN counter_tags ctag ON ct.id = ctag.counter_id
		LEFT JOIN tags t ON ctag.tag_id = t.id
		LEFT JOIN tag_shares ts ON t.id = ts.tag_id
		WHERE c.deletetime IS NULL
		  AND ct.deletetime IS NULL
		  AND (ct."user" = $1 OR t.user_id = $1 OR ts.user_id = $1)
		ORDER BY c.when ASC`
	rows, err := db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	counts := make([]*Count, 0)
	for rows.Next() {
		var c Count
		if err := rows.Scan(&c.ID, &c.CounterID, &c.UserID, &c.Delta, &c.Operation, &c.When, &c.DeleteTime); err != nil {
			return nil, err
		}
		counts = append(counts, &c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return counts, nil
}

// SoftDeleteCountForUser marks a count record as deleted if it's owned by the user.
// It returns true if a row was affected and false otherwise.
func SoftDeleteCountForUser(userID, countID int) (bool, error) {
    if db == nil {
        return false, fmt.Errorf("database not initialized")
    }
    const query = `
        UPDATE counts
        SET deletetime = NOW()
        WHERE id = $1
          AND deletetime IS NULL
          AND counter IN (SELECT id FROM counters WHERE "user" = $2 AND deletetime IS NULL)`
    res, err := db.Exec(query, countID, userID)
    if err != nil {
        return false, err
    }
    rows, err := res.RowsAffected()
    if err != nil {
        return false, err
    }
    return rows > 0, nil
}

// SoftDeleteCount marks a count record as deleted by writing the
// current timestamp into the `deletetime` column. The function
// returns `true` if a row was affected and `false` otherwise.
func SoftDeleteCount(countID int) (bool, error) {
    if db == nil {
        return false, fmt.Errorf("database not initialized")
    }
    const query = `UPDATE counts SET deletetime = now()
        WHERE id = $1 AND deletetime IS NULL`
    res, err := db.Exec(query, countID)
    if err != nil {
        return false, err
    }
    rows, err := res.RowsAffected()
    if err != nil {
        return false, err
    }
    return rows > 0, nil
}

// UpdateCountTimestamp updates the 'when' timestamp of a count if owned by user.
func UpdateCountTimestamp(userID, countID int, when time.Time) (bool, error) {
	if db == nil {
		return false, fmt.Errorf("database not initialized")
	}
	const query = `
		UPDATE counts
		SET "when" = $1
		WHERE id = $2
		  AND deletetime IS NULL
		  AND counter IN (SELECT id FROM counters WHERE "user" = $3 AND deletetime IS NULL)`
	res, err := db.Exec(query, when, countID, userID)
	if err != nil {
		return false, err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return rows > 0, nil
}
