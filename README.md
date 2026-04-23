# Description

This is a vibe-coded project for launching an Progressive Web App reimagination of the [vibe-cmdline-counters](https://github.com/larsjaas/vibe-cmdline-counters) project. It has a REST backend in Go, and a typescript+react web app that is served by nginx.

I am using this project to explore LLM vibe coding, what is possible with what is available for free, and reasonable to run on my M4 Mac Book Pro (48GB). I am intentionally not interfering with the code the LLM creates more than strictly necessary. For instance, my bundled LLM tool set is not 100% and will oftentimes cause incorrect edits (model-dependent) that I might go in and correct by hand. Because of this *least-amount-of-manual-coding* policy, the aesthetics of the app is assumed to be quite cumbersome to get pleasing, and is therefore not a priority before the app is fully functional. There will be a sudden facelift.

Using:
- Raspberry Pi Sandbox (RPi 5, but >= 3 should do fine)
  - node, go, docker
  - pi / @mariozechner/pi-coding-agent
- 48GB M4 Mac Book Pro
  - ollama + gemma4:31b (was: ollama + gpt-oss:20b)
  - ssh/mosh, VSCode w/SSH
- Tailscale private network

# LLM Models

The list of LLM models used during vibe-coding.

## gpt-oss:20b

This was the first model I started the whole project with, and which implemented the full vibe-cmdline-counters repo. I started having problems getting gpt-oss:20b to behave as wanted approximately at commit 2829137c72427081dc860a82b08b86dcfd108d24 - could no longer get it to follow my instructions - and no amount of session-clearing seemed to help. gpt-oss was also quite bad at using apply_patch tool, and produced a lot of bad edits (chunks ending up on top or at the bottom of files). This was very frustrating, and I eventually decided to give up on the model. I could probably have gotten further with tuning max-tokens and temperature and such parameters.

## qwen3-coder:30b

This model seemed promising, but it only produced tool calls using XML, which pi-coding-agents didn't pick up on. Being too new at pi-coding-agents I did not know how to extend it to parse those tool calls.

## gemma4:31b (current)

The gemma4:31b model produced tool calls that pi-coding-agents picks up right out of the box, and the edits seems to be on point. It also and follow my instructions on what to implement (even better!), so I am seeing how far I can continue with gemma4:31b.


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

    $ ( cd backend && \
        go mod download github.com/lib/pq && \
        go build cmd/server/server.go )
    $ ./backend/server

Point a browser to `http://<server.com>:8080/` (or whatever hostname it is served from).


# SSL / https

To use SSL/TLS, you need to update nginx.conf and docker-compose.yml. The diffs look something like this:

    diff --git a/nginx.conf b/nginx.conf
    index 8da09ac..33a985c 100644
    --- a/nginx.conf
    +++ b/nginx.conf
    @@ -6,7 +6,10 @@ http {
         default_type  application/octet-stream;
    
         server {
    -        listen 80;
    +        listen 443 ssl;
    +        server_name hostname.taild6axxx.ts.net;
    +        ssl_certificate /etc/ssl/certs/cert.crt;
    +        ssl_certificate_key /etc/ssl/private/key.key;
    
             # Proxy API requests to the Go backend
             location /api/ {

and

    diff --git a/docker-compose.yml b/docker-compose.yml
    index e23921e..261a2ce 100644
    --- a/docker-compose.yml
    +++ b/docker-compose.yml
    @@ -33,6 +33,8 @@ services:
           - "443:443"
         volumes:
           - ./nginx.conf:/etc/nginx/nginx.conf:ro
    +      - ./certs/cert.crt:/etc/ssl/certs/cert.crt:ro
    +      - ./certs/key.key:/etc/ssl/private/key.key:ro
           - ./html:/usr/share/nginx/html:ro
         depends_on:
           postgres:

The way to obtain certs for your development setup depends on your environment.


## Internet Node or Production

Use letsencrypt/certbot and copy the certificates under certs/, or integrate them with your webserver of choice.


## Tailscale Node

Find the node fully qualified Tailscale-net hostname, and request SSL certificates for the server on the Tailscale website. Put the certificates under certs/.


# Swagger UI

To use the backend API with swagger-ui, I have placed openapi.yaml under src/public which is accessible at http://hostnameport/openapi.yaml. The servers url in openapi.yaml must be updated to reflect the real port for the backend api server.


# License

This is on purpose 95% vibe-coded. No license will probably hold up in court.

