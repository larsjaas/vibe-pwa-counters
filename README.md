# Description

This is a vibe-coded project for launching an Progressive Web App reimagination of the
@larsjaas/vibe-cmdline-counters project. It has a REST backend in Go, and a javascript
frontend.

Using:
- pi / @mariozechner/pi-coding-agent
- ollama + gpt-oss:20b
- node


# Purpose

- Learn a bit of Go programming
- Set up OAuth 2.0 with Google for a Web app from scratch
- Learn to set up a PWA that will behave like an app on mobile, and also work offline
- Create the mobile app equivalent of the @larsjaas/vibe-cmdline-counters utility
- Familiarize myself with AI-agentic coding and how far it can be pushed with local/self-hosted models


# Development

Launch pi with the following command, and let it rip!

    $ pi -e tools/tools.ts

Edit sources with an editor or IDE if/when necessary.


# Running

You need a Google Auth Client Id to run the backend with OAuth.
(TODO: also be able to launch without OAuth login)

If you want to send the OAuth redirect to a Tailscale device, you will need a valid
toplevel domain for the server address (just hostname won't validate in the
Google Cloud Console), so add something like the below to /etc/hosts if you have
that kind of setup.

    # tailscale-IP    host     full hostname
    100.101.102.103   server   server.com

If you can use "localhost" instead, then you don't need the above.

Set up the environment variables the Go backend needs:

    $ export GOOGLE_CLIENT_ID="[...].apps.googleusercontent.com"
    $ export GOOGLE_REDIRECT_URI="http://<server.com>:8080/api/auth/google/callback"
    $ export DATABASE_URL="postgres://postgres:postgres@localhost:5432/app?sslmode=disable"

Create the HTML directory.

    $ npm run build

Launch the backend dependencies (postgres, nginx):

    $ docker compose pull
    $ docker compose up -d

Launch the backend

    $ ( cd backend && go mod download github.com/lib/pq && go build cmd/server/server.go )
    $ ./backend/server

Point a browser to `http://<server.com>:8080/` (or whatever hostname it is served from).


# License

This is on purpose 99% vibe-coded. No license will probably hold up in court.

