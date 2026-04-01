/**
 * Runtime environment helper.
 *
 * In development, values come from import.meta.env (Vite reads .env files).
 * In production Docker containers, values come from window.__ENV__
 * which is generated at container startup by docker-entrypoint.sh.
 */

// Extend Window to include our runtime config
declare global {
    interface Window {
        __ENV__?: Record<string, string>
    }
}

function getEnv(key: string): string {
    // Prefer runtime config (Docker), fall back to build-time (Vite)
    return window.__ENV__?.[key] || import.meta.env[key] || ''
}

export const env = {
    VITE_CLERK_PUBLISHABLE_KEY: getEnv('VITE_CLERK_PUBLISHABLE_KEY'),
    VITE_API_BASE_URL: getEnv('VITE_API_BASE_URL'),
    BASE_PATH: getEnv('BASE_PATH') || '/',
}
