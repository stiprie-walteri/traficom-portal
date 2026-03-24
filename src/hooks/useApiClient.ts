import { useAuth } from "@clerk/clerk-react";
import axios, { AxiosInstance } from "axios";
import { useMemo } from "react";
import { env } from "@/lib/env";

function joinUrl(base: string, path: string): string {
    const b = base.replace(/\/+$/, "");
    const p = path.replace(/^\/+/, "");
    return `${b}/${p}`;
}

function normalizeBasePath(p: string): string {
    if (!p) return "/";
    if (p === "/") return "/";
    const noTrailing = p.replace(/\/+$/, "");
    return noTrailing.startsWith("/") ? noTrailing : `/${noTrailing}`;
}

function getApiBaseUrl(): string {
    // If explicitly set (absolute or relative), honor it.
    // Examples:
    // - https://api.example.com
    // - /api (host-relative)
    // - ./api (relative to current path)
    const explicit = (env.VITE_API_BASE_URL || "").trim();
    if (explicit) return explicit;

    // Default: same origin + BASE_PATH + /api
    const basePath = normalizeBasePath(env.BASE_PATH);
    const prefix = basePath === "/" ? "" : basePath;

    // window.location.origin is safe in browser, and avoids accidentally dropping the base path.
    return joinUrl(window.location.origin, `${prefix}/api`);
}

const API_BASE_URL = getApiBaseUrl();

// Create a base axios instance without auth headers
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Hook that returns an authenticated axios instance.
 * It automatically injects the Clerk JWT token into the Authorization header.
 */
export function useApiClient(): AxiosInstance {
    const { getToken } = useAuth();

    const authenticatedClient = useMemo(() => {
        const instance = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                "Content-Type": "application/json",
            },
        });

        // Add a request interceptor to inject the token
        instance.interceptors.request.use(
            async (config) => {
                try {
                    const token = await getToken();
                    if (token) {
                        config.headers.Authorization = `Bearer ${token}`;
                    }
                } catch (error) {
                    console.error("Error getting Clerk token:", error);
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        return instance;
    }, [getToken]);

    return authenticatedClient;
}
