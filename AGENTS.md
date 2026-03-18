# AGENTS.md

## Project Overview
This project is two components.

### Component 1

The first component is a REST backend written in Go, using a PostgreSQL database for persistent storage.
The REST API pattern is CRUD for the most part. It is located in the subdirectory backend/.

Goals:
- Portable across Linux systems (including Raspberry Pi)
- No external dependencies
- Authorize clients by using Google's OAuth so people can use existing gmail accounts to get a user

### Component 2

The other component is a progressive web app for use on mobile phones. It is a PWA / SPA that fetches
all HTML and javascript from the server the backend runs on on launch, and use AJAX REST calls for online
CRUD operations.
When the app does not have access to the backend it should operate against local storage,
and sync changes with the backend when it is accessible again.

The PWA component is written in TypeScript, React, HTML, using Node for .

Goals:
- The app should be able to launch successfully when saved locally, even if the backend is inaccessible
- During launch, the app should check for new versions to download and update itself
- The app should use event-sourcing pattern to store updates in local storage when the backend or app is offline, which
  will be replayed when the app connects to the backend successfully again
- If the user is not logged in on the backend, a standard Google OAuth account selector should be used to identify the client

---

# Agent Instructions

You are an autonomous coding agent working in this repository.

You may use tools to explore, modify, and build the project.

Always prefer tools instead of guessing file contents.


---

# Available Tools

## write_file

Write a file to disk, creating directories if necessary.

Parameters:
- path (string): path to file
- contents (string): file contents

Example:
{
  "path": "backend/main.go",
  "contents": "#include <stdio.h>\nint main(){printf(\"hi\");}"
}

---

## search

Search for text within the repository.

Use this tool to locate functions, structs, or code fragments.

Example:

{
  "path": "backend",
  "query": "read_counters"
}

---

## read_file

Read part of a file with line numbers.

Always read files before editing them.

Example:

{
  "path": "backend/main.go",
  "start_line": 1,
  "end_line": 200
}

---

## apply_patch

Apply a unified patch to modify files.
Always prefer patches instead of rewriting entire files.
Use two lines of context above and below the changes to help patch behave correctly.
Patch must follow this format:

*** Begin Patch
*** Update File: src/main.c
@@
  // some comment
  if (true) {
-   printf("hello");
+   printf("hello world");
  }

*** End Patch

Example:

{
  "patch": "..."
}

---

## list_files

List files in a directory.

Use this to explore the repository structure. Specifying 'depth' is optional.

Example:

{
  "path": "src",
  "depth": 2
}

---

## run_shell

Execute shell commands to build or test the project.

Example:

{
  "command": "make"
}

---


## Project Structure

/backend    -> backend golang component
/app        -> typescript progressive web app
/package.json -> node setup

---

## Coding Guidelines

### GoLang
- Write idiomatic GoLang code.

### Typescript
- Write modern, idiomatic typescript.


## File Editing Rules (IMPORTANT)

When modifying code:
- Make **minimal, targeted changes**
- Do NOT rewrite entire files unless necessary
- Preserve formatting and structure
- Do not introduce unrelated refactoring

---

## Constraints

- No external dependencies
- No platform-specific code unless necessary

---

## Agent Behavior

When acting as a coding agent:

1. Understand the requested feature or bugfix
2. Identify minimal required file changes
3. Modify only relevant files
4. Ensure:
   - Code compiles cleanly
   - CLI behavior remains consistent
5. Add brief comments for non-obvious logic
6. Do NOT introduce unnecessary complexity
