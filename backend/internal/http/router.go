package http

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
)

// RoutesDiscoveryHandler returns a JSON list of available API routes.
func RoutesDiscoveryHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var info []map[string]any
	for _, route := range apiRoutes {
		info = append(info, map[string]any{
			"method":      route.Method,
			"path":        route.Path,
			"description": route.Description,
			"auth":        route.Auth,
		})
	}
	if err := json.NewEncoder(w).Encode(info); err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
	}
}

// Route defines a single API endpoint and its associated metadata.
type Route struct {
	Method      string
	Path        string
	Handler     any // Can be http.HandlerFunc or func(http.ResponseWriter, *http.Request, int)
	Description string
	Auth        bool
	SessionAuth bool
}

// GetHandler returns the appropriate http.HandlerFunc for the route.
func (r Route) GetHandler() http.HandlerFunc {
	switch h := r.Handler.(type) {
	case func(http.ResponseWriter, *http.Request):
		if r.SessionAuth {
			return WithSessionAuth(func(w http.ResponseWriter, req *http.Request, uid int) {
				h(w, req)
			})
		}
		if r.Auth {
			return WithAuth(func(w http.ResponseWriter, req *http.Request, uid int) {
				h(w, req)
			})
		}
		return h
	case func(http.ResponseWriter, *http.Request, int):
		if r.SessionAuth {
			return WithSessionAuth(h)
		}
		if r.Auth {
			return WithAuth(h)
		}
		return nil
	default:
		return nil
	}
}

var apiRoutes = []Route{
	{Method: http.MethodGet, Path: "/api/health", Handler: HealthHandler, Description: "Health check endpoint", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/ping", Handler: PingHandler, Description: "Ping endpoint", Auth: false, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/logout", Handler: LogoutHandler, Description: "Logout user", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/login", Handler: LoginHandler, Description: "Initiate login", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/auth/github", Handler: GitHubLoginHandler, Description: "GitHub login", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/auth/github/callback", Handler: GitHubCallbackHandler, Description: "GitHub OAuth callback", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/auth/microsoft", Handler: MicrosoftLoginHandler, Description: "Microsoft login", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/auth/microsoft/callback", Handler: MicrosoftCallbackHandler, Description: "Microsoft OAuth callback", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/auth/facebook", Handler: MetaLoginHandler, Description: "Meta login", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/auth/facebook/callback", Handler: MetaCallbackHandler, Description: "Meta OAuth callback", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/auth/google/callback", Handler: AuthCallbackHandler, Description: "Google OAuth callback", Auth: false, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/counters", Handler: CreateCounter, Description: "Create a new counter", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/counters", Handler: ListCounters, Description: "List user counters", Auth: true, SessionAuth: false},
	{Method: http.MethodPatch, Path: "/api/counters/{id}", Handler: ArchiveCounter, Description: "Archive a counter", Auth: true, SessionAuth: false},
	{Method: http.MethodPut, Path: "/api/counters/{id}", Handler: ArchiveCounter, Description: "Archive a counter", Auth: true, SessionAuth: false},
	{Method: http.MethodDelete, Path: "/api/counters/{id}", Handler: DeleteCounter, Description: "Delete a counter", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/settings", Handler: ListUserSettings, Description: "List user settings", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/settings", Handler: SetUserSetting, Description: "Set user setting", Auth: true, SessionAuth: false},
	{Method: http.MethodDelete, Path: "/api/settings", Handler: DeleteUserSetting, Description: "Delete user setting", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/metrics", Handler: MetricsHandler, Description: "Prometheus metrics", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/account", Handler: GetAccountInfo, Description: "Get account information", Auth: false, SessionAuth: true},
	{Method: http.MethodDelete, Path: "/api/account", Handler: DeleteAccount, Description: "Delete account", Auth: false, SessionAuth: true},
	{Method: http.MethodPost, Path: "/api/account/create", Handler: ConfirmSignupHandler, Description: "Finalize account creation", Auth: false, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/account/notification-email", Handler: RequestNotificationEmailHandler, Description: "Request notification email change", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/verify-notification-email", Handler: VerifyNotificationEmailHandler, Description: "Verify notification email", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/apikeys", Handler: ListAPIKeys, Description: "List user API keys", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/apikeys/create", Handler: CreateAPIKey, Description: "Create a new API key", Auth: true, SessionAuth: false},
	{Method: http.MethodDelete, Path: "/api/apikeys/{id}", Handler: DeleteAPIKey, Description: "Delete an API key", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/invites", Handler: ListInvites, Description: "List tag invitations", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/invites/{id}/accept", Handler: AcceptInvite, Description: "Accept a tag invitation", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/invites/{id}/reject", Handler: RejectInvite, Description: "Reject a tag invitation", Auth: true, SessionAuth: false},
	{Method: http.MethodDelete, Path: "/api/invites/{id}", Handler: RetractInvite, Description: "Retract a tag invitation", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/counts", Handler: ListCounts, Description: "List user count history", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/counts", Handler: CreateCount, Description: "Record a new count delta", Auth: true, SessionAuth: false},
	{Method: http.MethodPut, Path: "/api/counts/{id}", Handler: UpdateCountTimestamp, Description: "Update count timestamp", Auth: true, SessionAuth: false},
	{Method: http.MethodDelete, Path: "/api/counts/{id}", Handler: DeleteCount, Description: "Delete a count record", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/tags", Handler: GetTags, Description: "List user tags", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/tags", Handler: CreateTag, Description: "Create a new tag", Auth: true, SessionAuth: false},
	{Method: http.MethodPut, Path: "/api/tags/{id}", Handler: UpdateTag, Description: "Update tag details", Auth: true, SessionAuth: false},
	{Method: http.MethodDelete, Path: "/api/tags/{id}", Handler: DeleteTag, Description: "Delete a tag", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/tags/{id}/counters", Handler: GetCountersForTag, Description: "List counters for a tag", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/tags/{id}/counters/{cid}", Handler: AddTagToCounter, Description: "Add tag to counter", Auth: true, SessionAuth: false},
	{Method: http.MethodDelete, Path: "/api/tags/{id}/counters/{cid}", Handler: RemoveTagFromCounter, Description: "Remove tag from counter", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/tags/{id}/invites", Handler: CreateInvite, Description: "Invite user to tag", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/tags/{id}/shares", Handler: GetTagShares, Description: "List tag shares", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/tags/{id}/shares", Handler: ShareTag, Description: "Share a tag (creates invite)", Auth: true, SessionAuth: false},
	{Method: http.MethodDelete, Path: "/api/tags/{id}/shares/{email}", Handler: UnshareTag, Description: "Remove share or retract invite", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/tags/{id}/settings", Handler: GetTagSettings, Description: "Get tag settings", Auth: true, SessionAuth: false},
	{Method: http.MethodPost, Path: "/api/tags/{id}/settings", Handler: SetTagSetting, Description: "Set tag setting", Auth: true, SessionAuth: false},
	{Method: http.MethodDelete, Path: "/api/tags/{id}/settings", Handler: DeleteTagSetting, Description: "Delete tag setting", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/tags/shares/me", Handler: GetUserTagShares, Description: "List tags shared with me", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/info", Handler: InfoHandler, Description: "Backend information", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/validate-session", Handler: ValidateSessionHandler, Description: "Validate session cookie", Auth: false, SessionAuth: false},
	{Method: http.MethodGet, Path: "/api/events", Handler: EventsHandler, Description: "Event stream endpoint", Auth: true, SessionAuth: false},
	{Method: http.MethodGet, Path: "/", Handler: CatchAllHandler, Description: "Catch-all app entry point", Auth: false, SessionAuth: false},
}

// NewRouter instantiates a new ServeMux and registers all
// routes used by the REST backend.  It centralises route wiring so
// that the main server bootstrap remains lightweight.
func NewRouter() http.Handler {
    mux := http.NewServeMux()

    // Register routes from the registry
    for _, r := range apiRoutes {
        handler := r.GetHandler()
        if handler != nil {
            pattern := fmt.Sprintf("%s %s", r.Method, r.Path)
			log.Printf("Registering route %s", pattern)
            mux.HandleFunc(pattern, handler)
        }
    }

    // Register discovery endpoint manually to avoid initialization cycle
    log.Printf("Registering route GET /api/routes")
    mux.HandleFunc("GET /api/routes", RoutesDiscoveryHandler)

    fmt.Println("HTTP routes registered – listening on :8081")
    return mux
}
