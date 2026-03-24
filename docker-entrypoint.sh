#!/bin/sh
# Generate runtime config from environment variables.
# This runs at container startup so Docker env vars are available
# to the already-built frontend bundle.

# Normalize BASE_PATH: ensure a leading slash and no trailing slash (except for root "/")
BASE_PATH="${BASE_PATH:-/}"
if [ "$BASE_PATH" != "/" ]; then
    BASE_PATH="${BASE_PATH%/}"
    case "$BASE_PATH" in
        /*) ;;
        *) BASE_PATH="/$BASE_PATH" ;;
    esac
fi

# Generate runtime config
cat > /usr/share/nginx/html/config.js <<EOF
window.__ENV__ = {
  VITE_CLERK_PUBLISHABLE_KEY: "${VITE_CLERK_PUBLISHABLE_KEY:-}",
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-}",
  BASE_PATH: "${BASE_PATH}"
};
EOF

# Generate nginx config dynamically based on BASE_PATH
{
  printf 'server {\n'
  printf '    listen 3000;\n'
  printf '    server_name _;\n'
  printf '    root /usr/share/nginx/html;\n'
  printf '    index index.html;\n\n'
  printf '    gzip on;\n'
  printf '    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;\n\n'
  printf '    location %s {\n' "$BASE_PATH"
  printf '        try_files $uri $uri/ /index.html;\n'
  printf '    }\n'
  if [ "$BASE_PATH" != "/" ]; then
    printf '\n    location / {\n'
    printf '        try_files $uri $uri/ =404;\n'
    printf '    }\n'
  fi
  printf '\n    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\n'
  printf '        expires 1y;\n'
  printf '        add_header Cache-Control "public, immutable";\n'
  printf '    }\n'
  printf '}\n'
} > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
