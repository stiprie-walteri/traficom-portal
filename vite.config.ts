import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:3000'

  return {
    base: mode === 'production' ? './' : '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            // Rewrite redirect Location headers so the browser follows them
            // through the dev proxy instead of directly to the backend (CORS).
            proxy.on('proxyRes', (proxyRes) => {
              const status = proxyRes.statusCode || 0
              if (status >= 301 && status <= 308 && proxyRes.headers.location) {
                try {
                  const loc = new URL(proxyRes.headers.location, apiTarget)
                  // Rewrite to a relative path so the browser stays on localhost
                  proxyRes.headers.location = loc.pathname + loc.search
                } catch {
                  // leave as-is if URL parsing fails
                }
              }
            })
          },
        },
      },
    },
  }
})