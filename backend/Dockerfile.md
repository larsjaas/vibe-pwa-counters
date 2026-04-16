### Instructions for use:

1. Place the file: Save this as Dockerfile in the root of your backend directory (where your go.mod is located).
2. Build the image:
  ```bash
    docker build -t my-backend-app .
  ```
3. Run the container:
  ```bash
    docker run -d --name backend -p 8080:8080 my-backend-app
  ```
  (Note: Replace 8080 with the actual port your application listens on).

### Key Design Choices:

- Multi-stage Build: I separated the build environment (which includes the Go compiler and tools) from the runtime environment (Alpine Linux).  This reduces the image size from ~300MB down to ~20MB.
- Static Compilation: By setting CGO_ENABLED=0, the binary is statically linked, meaning it doesn't require various C libraries to be present in the final Alpine image.
- Security: I added an appuser so the application does not run as root, adhering to the principle of least privilege.
- Caching: Copying go.mod and go.sum before the source code ensures that go mod download is only run when dependencies change, speeding up subsequent builds.
