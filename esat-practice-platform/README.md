# ESAT Practice Platform

An AI-powered practice platform for the **ESAT** (Engineering & Science Admissions
Test). Practice from a curated question bank, generate brand-new exam-style
questions with AI, and test yourself with instant-scoring quizzes.

Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and the
**Anthropic API** for question generation.

## Features

- **Access stored content** — browse and filter a curated bank of ESAT questions
  across all five sections (Mathematics 1, Physics, Chemistry, Biology,
  Mathematics 2), with worked explanations.
- **Generate your own** — use AI to create fresh questions for any section,
  topic, and difficulty. Optionally paste reference material to ground them.
  Save generated questions back into the bank.
- **Take a quiz** — build a randomized quiz from the bank, answer, check, and get
  scored with a full review at the end.

## Getting started

```bash
cd esat-practice-platform
npm install

# Configure your Anthropic API key for AI generation
cp .env.example .env.local
# then edit .env.local and set ANTHROPIC_API_KEY

npm run dev
```

Open http://localhost:3000.

> The curated bank, practice browsing, and quizzes work **without** an API key.
> Only the **AI Generator** requires `ANTHROPIC_API_KEY`.

## Configuration

| Variable            | Required | Default            | Description                          |
| ------------------- | -------- | ------------------ | ------------------------------------ |
| `ANTHROPIC_API_KEY` | for AI   | —                  | Anthropic API key for generation.    |
| `ANTHROPIC_MODEL`   | no       | `claude-sonnet-5`  | Model used for generation.           |

## Project structure

```
src/
  app/
    page.tsx              Dashboard with stats and section links
    practice/             Filterable question bank
    generate/             AI generation UI
    quiz/                 Quiz builder + runner
    api/
      questions/          GET (list/filter) + POST (save generated)
      generate/           POST (AI generation)
  components/             Nav, QuestionCard, QuizRunner, badges
  lib/
    esat.ts               Section + difficulty metadata
    types.ts              Shared types
    store.ts              Question storage (seed JSON + runtime file)
    anthropic.ts          Anthropic client + generation logic
  data/
    questions.json        Bundled seed question bank
```

## How content is stored

- **Seed content** ships in `src/data/questions.json`.
- **Generated content** the user saves is written to `data/generated.json` at the
  project root (created on first save). This keeps the read/write surface tiny —
  swap `src/lib/store.ts` for a database to deploy to a serverless/multi-instance
  environment.

## Deployment (Hostinger VPS via GitHub Actions)

Push-to-deploy is configured in `.github/workflows/deploy.yml`: pushes to `main`
build the app on a GitHub runner and ship the standalone bundle to the VPS over
SSH, then restart a systemd service behind an Nginx reverse proxy.

See **[`deploy/README.md`](./deploy/README.md)** for the full one-time server
setup, the list of GitHub secrets to add, and troubleshooting. Server-side
templates live in `deploy/` (`esat-prep.service`, `nginx.conf`).

## Notes

- Question generation uses the Anthropic Messages API with **structured outputs**
  (JSON Schema) so responses are always schema-valid, plus a post-validation pass
  that drops any malformed question.
- Not affiliated with any examining body. For practice use.
