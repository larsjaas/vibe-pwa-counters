# Description

This is a vibe-coded project for launching an Progressive Web App reimagination of the
@larsjaas/vibe-cmdline-counters project. It has a REST backend in Go, and a javascript
frontend.

Using:
- pi / pi-coding-agents
- ollama + gpt-oss:20b
- node


# Purpose

- Explore Go programming
- Learn to set up a PWA that will behave like an app on mobile (and work offline)
- Create the mobile app equivalent of the @larsjaas/vibe-cmdline-counters utility


# Development

Launch pi with

    $ pi -e tools/tools.ts


# Running

Launch the backend dependencies (postgres, nginx):

    $ docker compose pull
    $ docker compose up -d

Launch the backend

    $ go run backend/main.go

Point a browser to `http://hostname:8080/`.


# License

This is on purpose 99% vibe-coded. No license will probably hold up in court.

