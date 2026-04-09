# Description

This is a vibe-coded project for launching an Progressive Web App reimagination of the [vibe-cmdline-counters](https://github.com/larsjaas/vibe-cmdline-counters) project. It has a REST backend in Go, and a javascript web app that is served by nginx.

I am using this project to explore what is possible with what is available for free and reasonable to run on my M4 Mac Book Pro. I am intentionally not interfering with the code the LLM creates more than strictly necessary. For instance, my bundled LLM tool set is not 100% and will oftentimes cause incorrect edits that I might go in and correct by hand. Because of this *least-amount-of-manual-coding* policy, the aesthetics of the app will likely be very cumbersome to get pleasing, and is therefore not a priority before the app is fully functional.

Using:
- Raspberry Pi Sandbox
  - node, go, docker
  - pi / @mariozechner/pi-coding-agent
- 48GB M4 Mac Book Pro
  - ollama + gemma4:31b (was: ollama + gpt-oss:20b)
  - ssh/mosh, VSCode w/SSH
- Tailscale private network

I started having problems getting gpt-oss:20b to behave as wanted approximately at commit 2829137c72427081dc860a82b08b86dcfd108d24, so I am currently exploring new models. Could also be token config parameters that are too restricted or something similar, but I think I regardless should see if there are other well-performing LLMs out there. qwen3-coder-30b-a3b-instruct is a candidate, but gemma4:31b seems to be able to use the tools out-of-the-box (great!) and follow my instructions (even better!) I am seeing how far I can continue with gemma4:31b.


# Purpose

- Learn basic Go programming
- Set up OAuth 2.0 with Google for a Web service from scratch
- Learn to set up a PWA that will behave like an app on mobile, and also work offline
- Create the mobile app equivalent of the @larsjaas/vibe-cmdline-counters utility
- Familiarize myself with AI-agentic coding and how far it can be pushed with local/self-hosted models


# Development

Launch pi-coding-agents with the following command, and let it rip!

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

Create/build the HTML (PWA frontend) directory. Needs to be done when changing frontend code.

    $ npm run build

Launch the backend dependencies (postgres, nginx).

    $ docker compose pull
    $ docker compose up -d

Launch the backend API server.

    $ ( cd backend && go mod download github.com/lib/pq && go run cmd/server/server.go )
    $ ./backend/server

Point a browser to `http://<server.com>:8080/` (or whatever hostname it is served from).


# License

This is on purpose 95% vibe-coded. No license will probably hold up in court.

