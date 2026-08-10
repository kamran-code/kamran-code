# Deploy on Railway (GitHub push-to-deploy)

Railway builds and redeploys the app automatically every time you push to the
connected branch — no GitHub Actions, no SSH, no server to manage. This is the
current deployment path; the VPS workflow (`.github/workflows/deploy.yml`) is
kept only as a manual fallback.

## One-time setup

1. **Create the project**
   - Go to <https://railway.com> → **New Project** → **Deploy from GitHub repo**.
   - Authorize Railway for GitHub and pick **`kamran-code/kamran-code`**.
   - When it asks which branch to deploy, choose **`main`** (or whichever branch
     you want to track).

2. **Point Railway at the app subdirectory** (important — the app lives in a
   subfolder, not the repo root)
   - Open the service → **Settings** → **Source**.
   - Set **Root Directory** to `esat-practice-platform`.
   - Leave Build/Start commands blank — they come from `railway.json`
     (Nixpacks build; start = `node .next/standalone/server.js`).

3. **Environment variables** (service → **Variables**)

   | Variable | Value | Why |
   |---|---|---|
   | `INGEST_TOKEN` | the write token (same one baked into the skill zip) | authenticates content add/update/delete |
   | `DASHBOARD_PASSWORD` | your dashboard password | protects `/dashboard` |
   | `ESAT_DATA_DIR` | `/data` | where the question JSON is stored (must be on the Volume — see below) |
   | `NODE_ENV` | `production` | production build/runtime |

   Do **not** set `HOSTNAME` — the standalone server binds `0.0.0.0` by default
   and Railway injects `PORT` automatically. Forcing `HOSTNAME=127.0.0.1` would
   make the app unreachable.

4. **Add a persistent Volume** (critical — Railway's filesystem is otherwise
   ephemeral and every redeploy wipes it)
   - Service → **Settings** → **Volumes** → **New Volume**.
   - **Mount path:** `/data` (must match `ESAT_DATA_DIR`).
   - Without this, all questions added through the API/skill are lost on the
     next deploy or restart.

5. **Deploy** — Railway builds on save. Watch **Deployments** for the build log;
   the healthcheck hits `/`.

## Custom domain (sourceopen.in)

1. Service → **Settings** → **Networking** → **Custom Domain** → add
   `sourceopen.in` (and/or `www.sourceopen.in`).
2. Railway shows a CNAME target. At your DNS provider, point the domain's record
   to that target (for an apex/root domain, use an ALIAS/ANAME or your
   registrar's CNAME-flattening; a `www` subdomain takes a plain CNAME).
3. Railway provisions HTTPS automatically once DNS resolves.
4. Once it's live on Railway, remove the old A record pointing at the VPS
   (`76.13.240.125`) so the domain resolves only to Railway.

## How the build works

- `railway.json` selects the Nixpacks builder and sets the start command.
- Nixpacks runs `npm ci` then `npm run build`. The `postbuild` script assembles
  the standalone bundle by copying `.next/static` and `public` next to
  `server.js`, so `node .next/standalone/server.js` serves CSS/JS/assets.
- `engines.node >= 20` in `package.json` pins the Node version Nixpacks picks.

## After the first deploy

- Test the dashboard at `https://<your-domain>/dashboard` (or the temporary
  `*.up.railway.app` URL) with `DASHBOARD_PASSWORD`.
- Confirm the skill still points at the right URL. If you keep `sourceopen.in`,
  the bundled skill needs no change; if you use the Railway URL, set
  `ESAT_API_URL` in the skill's `secrets.local.json`.
- Content added via the skill/API persists on the `/data` Volume across deploys.
