package main

import (
    "net/http"
    "log"
)

// landingPageHandler serves a minimal page with a centered Log In button.
func landingPageHandler(w http.ResponseWriter, r *http.Request) {
    log.Printf("/landing_page called: method=%s", r.Method)
    const html = `<!doctype html>
<html lang="en">
<body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:Arial,sans-serif;">
<button id="login" style="padding:1rem 2rem;font-size:1.2rem;cursor:pointer;">Log In</button>
<script>
  document.getElementById('login').addEventListener('click', function() {
    window.location.href = '/api/login';
  });
</script>
</body>
</html>`
    w.Header().Set("Content-Type", "text/html")
    w.Write([]byte(html))
}
