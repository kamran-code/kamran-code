# Deploying to a Hostinger VPS with GitHub Actions

This sets up **push-to-deploy**: every push to `main` that touches the app builds
on a GitHub runner and ships to your VPS over SSH, then restarts the service.
You configure the server **once**; after that you never touch it manually.

Architecture: `GitHub Actions → rsync standalone bundle → systemd runs
node server.js on 127.0.0.1:3000 → Nginx reverse-proxies :80/:443 → users`.

---

## One-time server setup

**Fast path — use the bootstrap script.** SSH in as root (or use Hostinger's
hPanel → VPS → Browser terminal) and run `deploy/bootstrap.sh`, which does every
step below in one go. First create the CI SSH key on your own machine
(`ssh-keygen -t ed25519 -f esat-deploy -N ""`), then on the server:

```bash
# paste the script in, or fetch it from your repo, then:
DOMAIN=esat.example.com EMAIL=you@example.com \
DEPLOY_PUBKEY="ssh-ed25519 AAAA... github-actions-esat" \
ANTHROPIC_API_KEY="sk-ant-..." \
sudo bash bootstrap.sh
```

Omit `DOMAIN`/`EMAIL` to serve on the bare IP without HTTPS; omit
`DEPLOY_PUBKEY`/`ANTHROPIC_API_KEY` to be prompted. Then add the GitHub secrets
below and push to `main`. The manual steps that follow are the same work,
spelled out, if you prefer to run them by hand.

---

### Manual steps

SSH into your VPS as root (or a sudo user) and run the following.

### 1. Install Node.js 20 and Nginx

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx rsync
node -v   # should print v20.x
```

### 2. Create a dedicated deploy user

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo mkdir -p /var/www/esat-prep
sudo chown -R deploy:deploy /var/www/esat-prep
```

### 3. Add an SSH key for GitHub Actions

On **your own machine** (not the server), generate a dedicated key:

```bash
ssh-keygen -t ed25519 -f esat-deploy -C "github-actions-esat" -N ""
```

This creates `esat-deploy` (private) and `esat-deploy.pub` (public).

Install the **public** key on the VPS for the `deploy` user:

```bash
sudo mkdir -p /home/deploy/.ssh
# paste the contents of esat-deploy.pub into authorized_keys:
sudo nano /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh && sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

The **private** key (`esat-deploy`) goes into a GitHub secret (step below). Do not
commit it or paste it anywhere else.

### 4. Store the app secrets on the server

The `ANTHROPIC_API_KEY` stays on the VPS (not in CI):

```bash
sudo mkdir -p /etc/esat-prep
sudo tee /etc/esat-prep/env >/dev/null <<'EOF'
ANTHROPIC_API_KEY=sk-ant-your-real-key
ANTHROPIC_MODEL=claude-sonnet-5
EOF
sudo chmod 640 /etc/esat-prep/env
sudo chown root:deploy /etc/esat-prep/env
```

### 5. Install the systemd service

Copy `deploy/esat-prep.service` from this repo to the server (edit `User`,
`WorkingDirectory`, and the node path first if they differ):

```bash
sudo cp esat-prep.service /etc/systemd/system/esat-prep.service
sudo systemctl daemon-reload
sudo systemctl enable esat-prep
# It won't start cleanly until the first deploy ships server.js — that's fine.
```

### 6. Let the deploy user restart the service without a password

The workflow runs `sudo systemctl restart esat-prep`. Grant exactly that:

```bash
echo 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart esat-prep' \
  | sudo tee /etc/sudoers.d/esat-prep-deploy
sudo chmod 440 /etc/sudoers.d/esat-prep-deploy
```

### 7. Configure Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/esat-prep
sudo nano /etc/nginx/sites-available/esat-prep   # set server_name to your domain
sudo ln -s /etc/nginx/sites-available/esat-prep /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default       # optional: drop the default site
sudo nginx -t && sudo systemctl reload nginx
```

### 8. (Recommended) HTTPS with Let's Encrypt

Point your domain's DNS `A` record at the VPS IP first, then:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d esat.example.com
```

Certbot edits the Nginx config to add TLS and an HTTP→HTTPS redirect, and sets up
auto-renewal.

---

## GitHub secrets

In the repo: **Settings → Secrets and variables → Actions → New repository secret**.

| Secret        | Value                                                        |
| ------------- | ----------------------------------------------------------- |
| `VPS_HOST`    | VPS IP address or hostname                                   |
| `VPS_USER`    | `deploy`                                                     |
| `VPS_SSH_KEY` | full contents of the **private** key file (`esat-deploy`)    |
| `VPS_APP_DIR` | `/var/www/esat-prep` (must match the systemd WorkingDirectory) |
| `VPS_PORT`    | SSH port — omit if it's the default `22`                     |

> The `ANTHROPIC_API_KEY` is **not** a GitHub secret — it lives in
> `/etc/esat-prep/env` on the server (step 4).

---

## Trigger a deploy

- The workflow lives at `.github/workflows/deploy.yml`. **It only becomes active
  once it's on the `main` branch** (GitHub runs workflows and shows the "Run
  workflow" button from the default branch). Merge this branch to `main` first.
- After that, any push to `main` under `esat-practice-platform/**` deploys
  automatically, or trigger it manually from the **Actions** tab → *Deploy ESAT
  Practice Platform* → **Run workflow**.

---

## Verify & troubleshoot

```bash
# On the VPS:
systemctl status esat-prep          # is the app running?
journalctl -u esat-prep -n 50 --no-pager   # app logs
curl -I http://127.0.0.1:3000       # app responding locally?
sudo nginx -t                       # nginx config valid?
```

| Symptom                                   | Likely cause / fix                                            |
| ----------------------------------------- | ------------------------------------------------------------ |
| Workflow fails at "Configure SSH"         | `VPS_SSH_KEY` malformed, or wrong `VPS_HOST`/`VPS_PORT`.      |
| "Permission denied (publickey)"           | Public key not in `/home/deploy/.ssh/authorized_keys`, or wrong perms. |
| Restart step fails with a sudo password prompt | The `sudoers.d/esat-prep-deploy` rule is missing or the node path in the unit is wrong. |
| 502 Bad Gateway from Nginx                | App not running on `127.0.0.1:3000` — check `journalctl -u esat-prep`. |
| AI generator returns a 503                | `ANTHROPIC_API_KEY` missing/invalid in `/etc/esat-prep/env` — fix it, then `sudo systemctl restart esat-prep`. |
