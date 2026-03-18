package main

import (
    "fmt"
    "net/http"
)

func main() {
    mux := http.NewServeMux()
    // Health check endpoint.
    mux.HandleFunc("/health", healthHandler)
    // Ping endpoint used for quick connectivity tests.
    mux.HandleFunc("/api/ping", pingHandler)

    // Catch-all handler for other routes
    mux.HandleFunc("/", catchAllHandler)

    fmt.Println("Listening on :8081")
    if err := http.ListenAndServe(":8081", mux); err != nil {
        panic(err)
    }
}

func pingHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        methodNotAllowed(w, r)
        return
    }
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("pong"))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        methodNotAllowed(w, r)
        return
    }
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

func catchAllHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        w.WriteHeader(http.StatusBadRequest)
        return
    }
    // For GET requests to paths other than /health, return 404
    w.WriteHeader(http.StatusNotFound)
}

func methodNotAllowed(w http.ResponseWriter, r *http.Request) {
    // For methods other than GET, respond with 400 Bad Request
    w.WriteHeader(http.StatusBadRequest)
}
