# Description

This is a vibe-coded project for launching an Progressive Web App reimagination of the [vibe-cmdline-counters](https://github.com/larsjaas/vibe-cmdline-counters) project. It has a REST backend in Go, and a typescript+react web app that is served by nginx.

A demo instance can be tested/used at [https://counters.crudbytes.com](https://counters.crudbytes.com).

I am using this project to explore LLM "vibe coding", what is possible with what is available for free, and reasonable to run on my M4 Mac Book Pro (48GB). I am intentionally not interfering much with the code the LLM creates more than strictly necessary. For instance, my bundled LLM tool set (and the models that try to use them) is not 100% and will oftentimes cause incorrect edits (extremely model-dependent). Such faulty edits I might go in and correct by hand. Because of this *least-amount-of-manual-coding* policy, the aesthetics of the app is assumed to be quite cumbersome to get pleasing, and is therefore not a priority before the app is fully functional. As of end of May 2026, we are more or less there. So there will be a sudden facelift.

I use "vibe coding" nonchalantly for now, but my goal is not to do insecure, unserious, "if-it-compiles, ship-it!" development with this, but as I get used to it; to explore getting closer to best practices software development using this technology without exhausting the hardware I'm developing on.

Using:
- Raspberry Pi Sandbox (RPi 5, but >= 3 should do fine)
  - node, vite, go, docker (postgresql, redis, nginx)
  - @mariozechner/pi-coding-agent
- 48GB M4 Mac Book Pro
  - llama-server + Qwen3.6 MTP (was: ollama + gemma4:31b-mlx (was: ollama + gpt-oss:20b))
  - ssh/mosh, tmux, VSCode w/SSH
- Tailscale private network

The frontend design is Mobile First, aesthetics last, and I have not gotten around to even look at making a desktop design for now. Better squeeze the browser into mobile screen aspect ratio - the current intended viewport.

Serving the LLM from my MacBook Pro is ok for hands-on prompt programming, but will not be a good long-term solution. A new Mac Mini (next generation) is probably in my future. The current setup means work stops when I am moving between locations and bringing my closed laptop with me, and my laptop has some aggressive idle->sleep behaviour (I'm sure it can be configured to be disabled) that means things work best when I am actively using the laptop, and not putting too much of a load on it myself with other things. Text editing, browsing, youtube and similar is totally fine, but I probably wouldn't want to do heavy Blender rendering or gaming and other CPU- or memory-intensive tasks while LLM-programming.


# LLM Models

Here is the list of LLM models that have been used during the development of this project.

## gpt-oss:20b for ollama

This was the first model I started the whole project with, and which implemented the full vibe-cmdline-counters repo. I started having problems getting gpt-oss:20b to behave as wanted approximately at commit 2829137c72427081dc860a82b08b86dcfd108d24 - could no longer get it to follow my instructions - and no amount of session-clearing seemed to help. gpt-oss was also quite bad at using apply_patch tool, and produced a lot of bad edits (chunks ending up on top or at the bottom of files). This was very frustrating, and I eventually decided to give up on the model. I could probably have gotten further with tuning max-tokens and temperature and such parameters.

## qwen3-coder:30b for ollama

This model seemed promising, but it only produced tool calls using XML, which pi-coding-agents didn't pick up on. Being too new at pi-coding-agents I did not know how to extend it to parse those tool calls.

## gemma4:31b for ollama

The gemma4:31b model produced tool calls that pi-coding-agents picked up right out of the box, and the edits seemed to be on point. It also followed my instructions on what to implement (even better!) and doesn't detour too much. On top of that, I've learnt to better manage my pi session(s) with compaction, rewinds, and asking for refactoring suggestions, which helps a great deal, so I am seeing how far I can continue with gemma4:31b. Apparently quite far...

The only thing to note about using this model is that it is a bit slow on my setup. One turn (a commit) can easily take 15-20 minutes, but it is impressively often on the money when it comes to the result. Better to be slow and right than fast and wrong... The 26b a4b variant is probably a great deal faster without compromising too much on the model capabilities, so I will probably explore that one pretty soon.

Running into la-la-land and stalling out on this model too often now, at commit fd92d3b5877bbc59eb2ab2d1a258419ad9d0e999. Could be me not being able to set contextSize and maxTokens (or other parameters) to suitable values. Anyways, I am waiting for local MTP-able models to be released soon, to get faster results, and I also want to be able to run more than ollama-models - run models I can fetch directly from huggingface.

## mlx-community/Qwen3.6-27B-OptiQ-4bit with vllm-mlx
 
First impression was that I am at least getting more speed out of this setup, and the model seems more methodical in its reasoning/approach. Tool usage seems to work, but sometimes slips with a stall-out. A bit too much friction caused me to quickly go back to Gemma4 when the MLX model came for Ollama. The state the project was in lead me to focus more on project development than on exploring LLMs at that moment in time.

## gemma4:31b-mlx for ollama

Just a variant of gemma4:31b, but MLX is machine learning especially for unified memory Apple silicon, which is what I am using. It ought to have given me a small efficiency boost switching to this one. It seems equally good as plain Gemma4:31B and equally prone to run out of memory when context grows, and to make aborted/logged tool calls.

## unsloth/Qwen3.6-27B-MTP-GGUF:UD-Q4_K_XL with llama.cpp/llama-server (current)

I have big hopes for this model, speed- and performance-wise, with all the hype around MTP. Not sure if 4-bit quantizitation is a good idea or not, but I am starting with this model. The initial few prompts have not failed me, and the speed is ok (as opposed to "slow", which I will categorize the other models as).

## Not-A-Conclusion

Up till now, Gemma4 31B has overall been the most successful model for this project. My guess though is that MTP will probably bump Qwen3.6 ahead (until the next advance in technology comes along), which is why I have switched over to it for now.


# Purpose

- Learn basic Go programming
- Set up OAuth 2.0 with Google++ for a Web service from scratch
- Learn to set up a PWA that will behave like an app on mobile, and also work offline
- Create the mobile app equivalent of the @larsjaas/vibe-cmdline-counters utility
- Familiarize myself with AI-agentic coding and how far it can be pushed with local/self-hosted models


# Development

Install pi-coding-agents in the sandbox of your choice.

    $ npm install -g @mariozechner/pi-coding-agent

Some tools are bundled with the project. Launch pi-coding-agents with the following command, and let it rip!

    $ pi -e tools/tools.ts

NB: Pi now seems to come with its own tools package, so the tools in this project might not be needed.


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

Set up / adjust the environment variables the Go backend needs:

    # OAuth login
    $ export GOOGLE_CLIENT_ID="[...].apps.googleusercontent.com"
    $ export GOOGLE_REDIRECT_URI="http://<server.com>:8080/api/auth/google/callback"

    # redis and postgres
    $ export REDIS_ADDR="localhost:6379"
    $ export DATABASE_URL="postgres://postgres:postgres@localhost:5432/app?sslmode=disable"

    # email integration
    $ export SMTP_HOST=smtp.domain.com
    $ export SMTP_PORT=12345
    $ export SMTP_USER=no-reply@domain.com
    $ export SMTP_PASS=...

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


# API keys

You can manage API keys for the accounts you create. These are currently not used for anything, but are intended for a replacement implementation of @larsjaas/vibe-cmdline-counters that works towards the same backend server as the web app so command line and web app are always in sync. Probably also programmed in Go.

To use an API key, place it as an "`Authorization: Bearer {API-key}`" HTTP-header in requests. See `src/public/openapi.yaml` for the REST API used by Counters.

