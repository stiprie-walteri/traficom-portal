import { useAuth } from "@clerk/clerk-react";
import axios, { AxiosInstance } from "axios";
import { useMemo } from "react";

// Create a base axios instance without auth headers
export const apiClient = axios.create({
    baseURL: "/api",
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
            baseURL: "/api",
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
