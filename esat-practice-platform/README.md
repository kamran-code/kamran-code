# ESAT Practice Platform

A practice platform for the **ESAT** (Engineering & Science Admissions Test).
Practice from a question bank, add new questions through an in-app **Content
Studio** (or push them programmatically), and test yourself with instant-scoring
quizzes.

Built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**. The
server needs **no AI API key** — content is authored elsewhere (in the UI, or by
an assistant) and added at runtime through an authenticated ingest endpoint.

## Features

- **Access stored content** — browse and filter a curated bank of ESAT questions
  across all five sections (Mathematics 1, Physics, Chemistry, Biology,
  Mathematics 2), with worked explanations.
- **Add content in the UI** — the Content Studio lets you compose questions with
  a form, or paste an AI-generated JSON batch, then push them **live** to the
  bank through the ingest API. No redeploy.
- **Take a quiz** — build a randomized quiz from the bank, answer, check, and get
  scored with a full review at the end.

## Getting started

```bash
cd esat-practice-platform
npm install

# Enable content push locally (optional for browsing/quizzes)
cp .env.example .env.local
# edit .env.local: set INGEST_TOKEN to any value for local dev

npm run dev
```

Open http://localhost:3000. Browsing and quizzes work with zero configuration;
pushing content from the Content Studio requires an `INGEST_TOKEN` (entered in
the UI, matched against the server's `INGEST_TOKEN`).

## Configuration (server env)

| Variable        | Required        | Default        | Description                                                        |
| --------------- | --------------- | -------------- | ------------------------------------------------------------------ |
| `INGEST_TOKEN`  | for content push | —             | Bearer token required by `POST /api/questions/import`. Without it, writes are disabled in production (503). |
| `ESAT_DATA_DIR` | recommended     | `<cwd>/data`   | Where pushed content is stored. In production set to a path **outside** the app dir (e.g. `/var/lib/esat-prep`) so it survives deploys. |

## How content flows

```
author (UI form / paste / assistant)  →  POST /api/questions/import (Bearer token)
                                       →  stored in ESAT_DATA_DIR  →  served immediately
```

There is **one write path**: the authenticated ingest endpoint. Content added
this way appears live with no redeploy. The app ships with a bundled baseline
bank; everything you add at runtime is layered on top.

**Content sources** (merged by `src/lib/store.ts`, in priority order):
1. `ESAT_DATA_DIR/generated.json` — runtime content pushed via the ingest endpoint.
2. `src/data/generated.json` — bundled baseline (committed).
3. `src/data/questions.json` — bundled seed content.

## The ingest endpoint

```
POST /api/questions/import
Authorization: Bearer <INGEST_TOKEN>
Content-Type: application/json

{ "questions": [ { section, topic, difficulty, question, options, correctIndex, explanation }, ... ] }

→ 200 { "saved": <n>, "skipped": <m>, "errors": [ "#i: reason", ... ] }
→ 401 missing/invalid token   → 503 no INGEST_TOKEN set (production)   → 422 nothing valid
```

Each question is validated and normalized server-side (`src/lib/ingest.ts`);
`id`, `source`, and `createdAt` are assigned for you.

## Authoring content

- **In the UI** — open **Content Studio** (`/generate`), enter your ingest token
  once (stored only in your browser), compose or paste questions, and push.
- **With the Claude skill** — [`.claude/skills/esat-content-generator/`](../.claude/skills/esat-content-generator/SKILL.md)
  (repo root) knows the exact schema, authors questions with no API key, and
  pushes via `push.mjs`:
  ```bash
  export ESAT_INGEST_TOKEN=...   # the server's INGEST_TOKEN
  export ESAT_API_URL=http://your-server
  node .claude/skills/esat-content-generator/push.mjs /tmp/batch.json
  ```

## Project structure

```
src/
  app/
    page.tsx              Dashboard with stats and section links
    practice/             Filterable question bank
    generate/             Content Studio (compose / paste → push via ingest API)
    quiz/                 Quiz builder + runner
    api/
      questions/          GET (list/filter)
      questions/import/   POST (authenticated ingest — the only write path)
  components/             Nav, QuestionCard, QuizRunner, badges
  lib/
    esat.ts               Section + difficulty metadata
    types.ts              Shared types
    store.ts              Question storage (runtime + committed + seed)
    ingest.ts             Token auth + per-question validation
  data/
    questions.json        Bundled seed bank
    generated.json        Bundled baseline generated bank
```

## Deployment (Hostinger VPS via GitHub Actions)

Push-to-deploy is configured in `.github/workflows/deploy.yml`: pushes to `main`
build the app on a GitHub runner and ship the standalone bundle to the VPS over
SSH, then restart a systemd service behind an Nginx reverse proxy. This deploys
**code**; content is separate and added at runtime via the ingest endpoint.

See **[`deploy/README.md`](./deploy/README.md)** for one-time server setup,
GitHub secrets, the `INGEST_TOKEN`/`ESAT_DATA_DIR` setup, and troubleshooting.

## Notes

- Not affiliated with any examining body. For practice use.
