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

## Generating content without a server API key

Generation happens **offline**, where an API key already lives (your machine, CI,
or an assistant), and the results are committed to `src/data/generated.json`.
Your CI/CD then ships them to the server, which serves static content and needs
**no Anthropic key**.

```
generate (with key)  →  src/data/generated.json  →  git push  →  CI deploy  →  server (no key)
```

Generate a batch locally:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run generate -- \
  --section physics --topic "Electricity and circuits" --difficulty medium --count 5

# preview without writing:
ANTHROPIC_API_KEY=sk-ant-... npm run generate -- --section biology --count 3 --dry-run
```

Then commit and push:

```bash
git add src/data/generated.json && git commit -m "Add generated physics questions" && git push
```

The push triggers the deploy workflow, which ships the updated bank to the VPS.
Content can also simply be hand-authored (or authored by an assistant) directly
in `src/data/generated.json` — same shape, same pipeline, zero API usage.

**Content sources** (all merged by `src/lib/store.ts`, in priority order):
1. `src/data/generated.json` — committed, shipped via git/CI (the offline pipeline).
2. `data/generated.json` — optional runtime file written by the on-server
   `/api/generate` flow **only if** the server has an API key. Not needed in production.
3. `src/data/questions.json` — bundled seed content.

With this pipeline you can remove `ANTHROPIC_API_KEY` from the server entirely;
the AI Generator page/endpoint just returns a 503 if used there, which is fine.

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
