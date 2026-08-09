# ESAT Practice Platform

A quiz platform for the **ESAT** (Engineering & Science Admissions Test).
End users pick a section and topic, take a quiz, and see their score with
explanations. All question content is managed by admins through an authenticated
API (and the `esat-content-generator` Claude skill) or a password-protected
dashboard — there is no AI key on the server and no redeploy to change content.

Built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

## What each audience gets

- **Players (public):** the home page is the quiz — choose section / topic /
  difficulty / count, start, answer, and get scored with a review at the end.
- **Admins (dashboard, password-protected):** `/dashboard` shows stats and a
  **filterable view of every stored question**, with single and bulk delete.
- **Content managers (Claude skill / API):** add, update, and delete questions
  (single or bulk) via the authenticated API; generate questions in the exact
  schema with the skill.

## Configuration (server env)

| Variable             | Required            | Default       | Description                                                             |
| -------------------- | ------------------- | ------------- | ----------------------------------------------------------------------- |
| `INGEST_TOKEN`       | for content writes  | —             | Bearer token for the write API. Without it, writes are 503 in prod.     |
| `DASHBOARD_PASSWORD` | for the dashboard   | —             | Password for `/dashboard`. Without it, the dashboard is disabled.       |
| `ESAT_DATA_DIR`      | recommended         | `<cwd>/data`  | Question store location. In prod use a path outside the app dir.        |

## Getting started

```bash
cd esat-practice-platform
npm install
cp .env.example .env.local     # set INGEST_TOKEN and DASHBOARD_PASSWORD (any values for dev)
npm run dev
```

Open http://localhost:3000 (quiz) and http://localhost:3000/dashboard (admin).
On first run the store is seeded from the bundled starter questions.

## Content API

All writes require `Authorization: Bearer <INGEST_TOKEN>` (or a dashboard
session cookie).

```
GET  /api/questions?section=&difficulty=&topic=&source=&search=    (public read)
POST /api/questions/import   { "questions": [ ...Question ] }       → { saved, skipped, errors }
POST /api/questions/update   { "updates": [ { id, ...fields } ] }   → { updated, missing }
POST /api/questions/delete   { "ids":[...] } | { "section":... } | { "all": true }  → { deleted }
POST /api/dashboard/login    { "password": "..." }                 → sets admin cookie
```

### Question schema

```json
{
  "section": "physics",              // mathematics1 | physics | chemistry | biology | mathematics2
  "topic": "Electricity and circuits",
  "difficulty": "medium",            // easy | medium | hard
  "question": "…",
  "options": ["…","…","…","…","…"],  // exactly 5
  "correctIndex": 2,                  // 0-based
  "explanation": "…"
}
```

`id`, `source`, `createdAt` are assigned server-side (`src/lib/ingest.ts`
validates and normalizes each question).

## Managing content with the Claude skill

The [`esat-content-generator`](../.claude/skills/esat-content-generator/SKILL.md)
skill (repo root `.claude/skills/`) authors questions in-schema and runs full
CRUD via `manage.mjs`:

```bash
export ESAT_INGEST_TOKEN=…            # the server's INGEST_TOKEN
export ESAT_API_URL=https://sourceopen.in
node .claude/skills/esat-content-generator/manage.mjs add    /tmp/batch.json
node .claude/skills/esat-content-generator/manage.mjs update /tmp/updates.json
node .claude/skills/esat-content-generator/manage.mjs delete --section physics
node .claude/skills/esat-content-generator/manage.mjs list   --difficulty hard
```

Or just ask Claude: *"generate 10 hard physics questions and add them,"* and the
skill authors + pushes them (no AI API key involved).

## Project structure

```
src/
  app/
    page.tsx              Public quiz (setup → play → results)
    dashboard/            Password-protected admin (stats, filterable list, delete)
    dashboard/login/      Login page
    api/
      questions/          GET (list/filter)
      questions/import/   POST add (auth)
      questions/update/   POST update (auth)
      questions/delete/   POST delete (auth)
      dashboard/login/    POST login (sets cookie)
      dashboard/logout/   POST logout
  components/             Nav, QuizRunner, QuestionCard, badges
  lib/
    esat.ts               Section + difficulty + topic metadata
    store.ts              Mutable question store with full CRUD
    ingest.ts             Write auth (token or admin cookie) + validation
    auth.ts               Dashboard password / session cookie
  data/                   Bundled starter questions (seed the store on first run)
```

## Deployment

Push-to-deploy via GitHub Actions (`.github/workflows/deploy.yml`) ships the
app to a VPS; content is separate and lives in `ESAT_DATA_DIR`. See
**[`deploy/README.md`](./deploy/README.md)** for server setup (including
`INGEST_TOKEN` / `DASHBOARD_PASSWORD`), the domain + HTTPS steps, and
troubleshooting.

## Notes

- Not affiliated with any examining body. For practice use.
