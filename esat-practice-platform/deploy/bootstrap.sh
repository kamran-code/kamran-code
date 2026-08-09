#!/usr/bin/env bash
#
# One-time VPS setup for the ESAT Practice Platform.
# Run this ONCE on the VPS as root (Hostinger hPanel → VPS → Browser terminal,
# or `ssh root@YOUR_VPS_IP`). It is self-contained — no repo checkout needed.
#
# It installs Node + Nginx, creates a deploy user, authorizes the CI SSH key,
# stores the Anthropic API key, and installs the systemd service, sudoers rule,
# and Nginx reverse proxy. No secrets are baked into this file — the public key
# and API key are read at runtime (prompted, or supplied via env vars).
#
# Non-interactive example:
#   DOMAIN=sourceopen.in EMAIL=you@example.com \
#   DEPLOY_PUBKEY="ssh-ed25519 AAAA... github-actions-esat" \
#   INGEST_TOKEN="$(openssl rand -hex 32)" DASHBOARD_PASSWORD="a-strong-password" \
#   bash bootstrap.sh
#
set -euo pipefail

# ---- Config (override via env) ------------------------------------------------
APP_DIR="${APP_DIR:-/var/www/esat-prep}"
DATA_DIR="${DATA_DIR:-/var/lib/esat-prep}"   # persistent, OUTSIDE app dir (survives deploys)
DEPLOY_USER="${DEPLOY_USER:-deploy}"
SERVICE="${SERVICE:-esat-prep}"
DOMAIN="${DOMAIN:-}"            # e.g. sourceopen.in; empty = serve on the IP
EMAIL="${EMAIL:-}"             # set to auto-run certbot for DOMAIN
NODE_MAJOR="${NODE_MAJOR:-20}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run as root (e.g. sudo bash bootstrap.sh)." >&2
  exit 1
fi

# ---- Gather secrets (prompt if not provided) ---------------------------------
if [ -z "${DEPLOY_PUBKEY:-}" ]; then
  echo "Paste the deploy PUBLIC key (contents of esat-deploy.pub), then press Enter:"
  read -r DEPLOY_PUBKEY
fi
if [ -z "${DEPLOY_PUBKEY:-}" ]; then
  echo "No public key provided — aborting." >&2
  exit 1
fi

# Ingest token authorizes content writes (add/update/delete). Auto-generate if
# not supplied.
if [ -z "${INGEST_TOKEN:-}" ]; then
  INGEST_TOKEN="$(openssl rand -hex 32 2>/dev/null || head -c 48 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 48)"
fi

# Dashboard password. Prompt (hidden) or auto-generate.
if [ -z "${DASHBOARD_PASSWORD:-}" ]; then
  read -rsp "Set a DASHBOARD_PASSWORD (Enter to auto-generate one): " DASHBOARD_PASSWORD
  echo
fi
if [ -z "${DASHBOARD_PASSWORD:-}" ]; then
  DASHBOARD_PASSWORD="$(openssl rand -hex 12 2>/dev/null || head -c 18 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 18)"
fi

# ---- Install packages --------------------------------------------------------
echo "==> Installing Node ${NODE_MAJOR}, Nginx, rsync..."
curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs nginx rsync
NODE_BIN="$(command -v node)"
SYSTEMCTL_BIN="$(command -v systemctl)"
echo "    node: $NODE_BIN ($(node -v))"

# ---- Deploy user + app dir ---------------------------------------------------
echo "==> Creating deploy user '$DEPLOY_USER', $APP_DIR, and $DATA_DIR..."
id -u "$DEPLOY_USER" >/dev/null 2>&1 || adduser --disabled-password --gecos "" "$DEPLOY_USER"
mkdir -p "$APP_DIR" "$DATA_DIR"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR" "$DATA_DIR"

# ---- Authorize the CI SSH key ------------------------------------------------
echo "==> Authorizing deploy SSH key..."
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
AUTH="/home/$DEPLOY_USER/.ssh/authorized_keys"
touch "$AUTH"
grep -qxF "$DEPLOY_PUBKEY" "$AUTH" || echo "$DEPLOY_PUBKEY" >> "$AUTH"
chown "$DEPLOY_USER:$DEPLOY_USER" "$AUTH"
chmod 600 "$AUTH"

# ---- App environment file ----------------------------------------------------
echo "==> Writing /etc/esat-prep/env..."
mkdir -p /etc/esat-prep
cat >/etc/esat-prep/env <<EOF
ESAT_DATA_DIR=${DATA_DIR}
INGEST_TOKEN=${INGEST_TOKEN}
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
EOF
chmod 640 /etc/esat-prep/env
chown root:"$DEPLOY_USER" /etc/esat-prep/env

# ---- systemd service ---------------------------------------------------------
echo "==> Installing systemd service '$SERVICE'..."
cat >"/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=ESAT Practice Platform (Next.js)
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=127.0.0.1
EnvironmentFile=/etc/esat-prep/env
ExecStart=$NODE_BIN server.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
"$SYSTEMCTL_BIN" daemon-reload
"$SYSTEMCTL_BIN" enable "$SERVICE"
echo "    (service will start on the first deploy, once server.js is shipped)"

# ---- Passwordless restart for the deploy user --------------------------------
echo "==> Adding narrow sudoers rule..."
echo "$DEPLOY_USER ALL=(root) NOPASSWD: $SYSTEMCTL_BIN restart $SERVICE" \
  > "/etc/sudoers.d/${SERVICE}-deploy"
chmod 440 "/etc/sudoers.d/${SERVICE}-deploy"
visudo -cf "/etc/sudoers.d/${SERVICE}-deploy"

# ---- Nginx reverse proxy -----------------------------------------------------
echo "==> Configuring Nginx..."
SERVER_NAME="${DOMAIN:-_}"
cat >"/etc/nginx/sites-available/${SERVICE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
    }
}
EOF
ln -sf "/etc/nginx/sites-available/${SERVICE}" "/etc/nginx/sites-enabled/${SERVICE}"
rm -f /etc/nginx/sites-enabled/default
# Validate config, then ensure nginx is enabled and running. `restart` works
# whether or not nginx was already started (a plain `reload` fails on a fresh
# box where the service isn't active yet).
nginx -t
"$SYSTEMCTL_BIN" enable nginx
"$SYSTEMCTL_BIN" restart nginx

# ---- Optional HTTPS ----------------------------------------------------------
if [ -n "$DOMAIN" ] && [ -n "$EMAIL" ]; then
  echo "==> Requesting Let's Encrypt certificate for $DOMAIN..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" \
    || echo "    (!) certbot failed — check DNS points at this server, then re-run."
elif [ -n "$DOMAIN" ]; then
  echo "    To enable HTTPS later: sudo apt-get install -y certbot python3-certbot-nginx && sudo certbot --nginx -d $DOMAIN"
fi

echo
echo "==> Server setup complete."
echo "    Next: add the GitHub secrets and push to main to trigger the first deploy."
echo "    VPS_APP_DIR must be: $APP_DIR"
echo
echo "    Dashboard password (for /dashboard):"
echo "      DASHBOARD_PASSWORD = $DASHBOARD_PASSWORD"
echo
echo "    Content management (skill) — set these locally:"
echo "      export ESAT_INGEST_TOKEN=$INGEST_TOKEN"
echo "      export ESAT_API_URL=${DOMAIN:+https://$DOMAIN}"
echo "    Keep both secret — they authorize writes and admin access."
