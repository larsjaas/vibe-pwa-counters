package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
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
    redisAddr := os.Getenv("REDIS_ADDR")
    if redisAddr == "" {
        redisAddr = "localhost:6379"
    }
    rdb := redis.NewClient(&redis.Options{Addr: redisAddr})


    var err error
    var status = rdb.Ping(context.Background())
    if err := status.Err(); err != nil {
        panic(err)
    }
    httpHandlers.SetRedisClient(rdb)

    // Ensure required environment variables are set.
    redirectURI := os.Getenv("GOOGLE_REDIRECT_URI")
    if redirectURI == "" {
        fmt.Println("Error: GOOGLE_REDIRECT_URI environment variable is not set")
        os.Exit(1)
    }
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

    // Initialize prometheus user count
    ctx := context.Background()
    count, err := db.GetActiveUsersCount(ctx)
    if err != nil {
        log.Printf("Failed to initialize user count metric: %v", err)
    } else {
        // Use a loop to initialize the counter since prometheus.Counter only supports Inc()
        for i := 0; i < count; i++ {
            httpHandlers.UserCount.Inc()
        }
    }

    // Initialize prometheus deleted user count
    delCount, err := db.GetDeletedUsersCount(ctx)
    if err != nil {
        log.Printf("Failed to initialize deleted user count metric: %v", err)
    } else {
        for i := 0; i < delCount; i++ {
            httpHandlers.UsersDeletedCount.Inc()
        }
    }

    // HTTP/REST server setup – routes registered in router.go
    mux := httpHandlers.NewRouter()

    fmt.Println("Listening on :8081")
    if err := http.ListenAndServe(":8081", mux); err != nil {
        panic(err)
    }
}
