package db

import (
    "database/sql"
    "fmt"
    "time"
)

// Count represents a row in the `count` table.
type Count struct {
    ID         int            `json:"id"`
    CounterID  int            `json:"counter"`
    Delta      int            `json:"delta"`
    When       time.Time      `json:"when"`
    DeleteTime sql.NullTime   `json:"deletetime"`
}

// InsertCount creates a new row in the count table for the supplied
// counter and delta. It returns the full Count struct with the newly
// generated ID and timestamp.
func InsertCount(counterID int, delta int) (*Count, error) {
    if db == nil {
        return nil, fmt.Errorf("database not initialized")
    }
    const query = `INSERT INTO count ("counter", delta) VALUES ($1, $2)
        RETURNING id, "counter", delta, "when", deletetime`
    var c Count
    var del int
    var when time.Time
    var deleteTime sql.NullTime
    err := db.QueryRow(query, counterID, delta).Scan(&c.ID, &c.CounterID, &del, &when, &deleteTime)
    if err != nil {
        return nil, err
    }
    c.CounterID = counterID
    c.Delta = delta
    c.When = when
    c.DeleteTime = deleteTime
    return &c, nil
}

// SoftDeleteCount marks a count record as deleted by writing the
// current timestamp into the `deletetime` column. The function
// returns `true` if a row was affected and `false` otherwise.
func SoftDeleteCount(countID int) (bool, error) {
    if db == nil {
        return false, fmt.Errorf("database not initialized")
    }
    const query = `UPDATE count SET deletetime = now()
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
