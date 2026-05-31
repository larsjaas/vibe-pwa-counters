const AUTH_PROVIDER_KEY = 'counters_auth_provider';
const AUTH_REDIRECT_KEY = 'counters_auth_redirect';

export interface AuthProvider {
    id: string;
    name: string;
}

/**
 * Remember which OAuth provider the user last used.
 * Called when the user initiates login with a specific provider.
 */
export function rememberAuthProvider(providerId: string): void {
    localStorage.setItem(AUTH_PROVIDER_KEY, providerId);
}

/**
 * Get the last-used auth provider, if any.
 */
export function getLastAuthProvider(): string | null {
    return localStorage.getItem(AUTH_PROVIDER_KEY);
}

/**
 * Store the current path so we can redirect back after re-authentication.
 */
export function rememberCurrentPath(): void {
    localStorage.setItem(AUTH_REDIRECT_KEY, window.location.pathname + window.location.search);
}

/**
 * Clear the remembered redirect path (call after successful redirect).
 */
export function clearRedirectPath(): void {
    localStorage.removeItem(AUTH_REDIRECT_KEY);
}

/**
 * Get the remembered redirect path, or '/' as default.
 */
export function getRedirectPath(): string {
    return localStorage.getItem(AUTH_REDIRECT_KEY) || '/';
}

/**
 * Redirect to the login flow.
 * If a provider was previously used, redirect directly to that provider.
 * Otherwise redirect to the landing page which lists all available providers.
 */
export function redirectToAuth(): void {
    rememberCurrentPath();
    const lastProvider = getLastAuthProvider();
    if (lastProvider) {
        // Redirect directly to the remembered provider
        if (lastProvider === 'google') {
            window.location.href = '/api/login';
        } else {
            window.location.href = `/api/auth/${lastProvider}`;
        }
    } else {
        // No remembered provider — show the landing page (provider selector)
        window.location.href = '/landing_page/index.html';
    }
}

/**
 * Redirect to a specific auth provider and remember the choice.
 */
export function redirectToProvider(providerId: string): void {
    rememberAuthProvider(providerId);
    rememberCurrentPath();
    if (providerId === 'google') {
        window.location.href = '/api/login';
    } else {
        window.location.href = `/api/auth/${providerId}`;
    }
}
