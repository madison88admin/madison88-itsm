#!/usr/bin/env bash
# ============================================================
# Madison88 ITSM — VPS Nginx Reverse Proxy Setup
# Run this on the VPS as root (or with sudo).
#
# Usage:
#   sudo bash vps-setup.sh                       # HTTP only (IP:80)
#   sudo bash vps-setup.sh api.example.com       # HTTP + HTTPS with Let's Encrypt
# ============================================================

set -euo pipefail

DOMAIN="${1:-}"
NODE_PORT="${NODE_PORT:-3001}"
NGINX_CONF="/etc/nginx/sites-available/madison88-itsm"
NGINX_LINK="/etc/nginx/sites-enabled/madison88-itsm"

# ---- Update packages ----
echo "📦 Installing nginx..."
apt-get update -qq && apt-get install -y -qq nginx certbot python3-certbot-nginx

# ---- Write nginx config ----
cat > "$NGINX_CONF" <<NGINX
upstream node_backend {
    server 127.0.0.1:${NODE_PORT};
    keepalive 32;
}

server {
    listen 80;
    server_name ${DOMAIN:-_};

    client_max_body_size 50m;

    # API reverse proxy
    location /api/ {
        proxy_pass http://node_backend;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade           \$http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout  90s;
        proxy_send_timeout  90s;
    }

    # Socket.io — WebSocket upgrade
    location /socket.io/ {
        proxy_pass http://node_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout  86400s;
        proxy_send_timeout  86400s;
    }

    # Health check
    location /health {
        proxy_pass http://node_backend/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    # Deny everything else
    location / {
        return 404;
    }
}
NGINX

# ---- Enable site ----
ln -sf "$NGINX_CONF" "$NGINX_LINK"
rm -f /etc/nginx/sites-enabled/default

# ---- Test & reload ----
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "✅ Nginx configured → proxying port 80 → Node port ${NODE_PORT}"

# ---- Optional: SSL via Let's Encrypt ----
if [ -n "$DOMAIN" ]; then
    echo "🔒 Obtaining SSL certificate for ${DOMAIN}..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@${DOMAIN} || {
        echo "⚠️  certbot failed — you can run it manually later:"
        echo "    sudo certbot --nginx -d ${DOMAIN}"
    }
    echo "✅ HTTPS enabled for ${DOMAIN}"
else
    echo ""
    echo "ℹ️  No domain provided — running HTTP only on port 80."
    echo "   To add SSL later, run:"
    echo "     sudo certbot --nginx -d your-domain.com"
fi

echo ""
echo "🧪 Test: curl -I http://localhost/health"
echo "🌐 If domain configured: curl -I https://${DOMAIN}/health"
