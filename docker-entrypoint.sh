#!/bin/sh
# Generate runtime config from environment variables.
# This runs at container startup so Docker env vars are available
# to the already-built frontend bundle.

cat > /usr/share/nginx/html/config.js <<EOF
window.__ENV__ = {
  VITE_CLERK_PUBLISHABLE_KEY: "${VITE_CLERK_PUBLISHABLE_KEY:-}",
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-}"
};
EOF

exec nginx -g "daemon off;"
