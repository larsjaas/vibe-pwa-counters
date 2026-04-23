# --- Stage 1: Build ---
FROM golang:1.25-alpine AS builder

# Install git for fetching dependencies if necessary
RUN apk add --no-cache git

# Set the working directory inside the container
WORKDIR /app

# Copy go.mod and go.sum first to leverage Docker cache for dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build terms:
# CGO_ENABLED=0 ensures a static binary (no dependency on C libraries)
# GOOS=linux targets the Linux OS
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

# --- Stage 2: Final ---
FROM alpine:latest

# Add a non-root user for security
RUN adduser -D appuser
USER appuser

WORKDIR /home/appuser/

# Copy the binary from the builder stage
COPY --from=builder /app/server .

# Copy the migrations folder from the builder stage
COPY --from=builder /app/migrations ./migrations

# Run the binary
CMD ["./server"]
