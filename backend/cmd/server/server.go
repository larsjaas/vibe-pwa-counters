package main

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"

	"github.com/larsa/pwa-counter/backend/internal/db"
	httpHandlers "github.com/larsa/pwa-counter/backend/internal/http"
	_ "github.com/lib/pq"
	redis "github.com/redis/go-redis/v9"
)

var dbConn *sql.DB

func main() {
    // --- Redis client setup -------------------------------------------------
    // The REST API now leverages a Redis instance for session storage.
    // A global client is shared across request handlers to avoid
    // re‑creating connections for each request.
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"}) // 'redis' if in docker container

    var err error
    var status = rdb.Ping(context.Background())
    if err := status.Err(); err != nil {
        panic(err)
    }
    httpHandlers.SetRedisClient(rdb)

    // Initialize database connection. Use DATABASE_URL env var if set,
    // otherwise fall back to the default Postgres container settings.
    dsn := os.Getenv("DATABASE_URL")
    if dsn == "" {
        dsn = "postgres://postgres:postgres@localhost:5432/counters?sslmode=disable"
    }

    dbConn, err = sql.Open("postgres", dsn)
    if err != nil {
        panic(err)
    }
    if err = dbConn.Ping(); err != nil {
        panic(err)
    }

    // Register the database handle with the internal db package so that
    // other packages can use it.
    db.SetDB(dbConn)

    // Run database migrations on startup. Delegated to the internal
    // database package for better separation of concerns.
    db.RunMigrations(dbConn)

    // HTTP/REST server setup – routes registered in router.go
    mux := httpHandlers.NewRouter()

    fmt.Println("Listening on :8081")
    if err := http.ListenAndServe(":8081", mux); err != nil {
        panic(err)
    }
}
