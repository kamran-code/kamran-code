---
name: esat-content-generator
description: >-
  Generate and manage ESAT (Engineering & Science Admissions Test) practice
  questions for the ESAT Practice Platform. Authors questions in the exact JSON
  schema and adds, updates, or deletes them (single or bulk) through the app's
  authenticated API. Use when asked to create, write, add, edit, fix, or remove
  ESAT/practice/exam questions for Maths 1, Physics, Chemistry, Biology, or
  Maths 2, or to manage the question bank.
---

# ESAT Content Generator & Manager

This skill is the single tool for all ESAT question content. It:

1. **Generates** exam-style questions in the exact schema (no AI API key needed —
   you, the model, author them).
2. **Manages** the live bank through the app's authenticated API — add, update,
   and delete, one item or in bulk.

Content lives only on the server and is changed only through these API endpoints
(the in-app dashboard uses the same ones). There is no commit-a-file path and no
redeploy.

## Configuration

- `ESAT_API_URL` — base URL of the app. **Default: `https://sourceopen.in`.**
- `ESAT_INGEST_TOKEN` — the server's `INGEST_TOKEN`, required for writes. Read
  from the environment; **never hardcode it** in files or commits.

All commands below are run with `node .claude/skills/esat-content-generator/manage.mjs`.

## The exact JSON schema

A question object (a batch is an array of these):

```json
{
  "section": "physics",
  "topic": "Electricity and circuits",
  "difficulty": "medium",
  "question": "A resistor of 5 ohm carries a current of 2 A. What is the potential difference across it?",
  "options": ["2.5 V", "7 V", "10 V", "0.4 V", "20 V"],
  "correctIndex": 2,
  "explanation": "By Ohm's law, V = I * R = 2 * 5 = 10 V."
}
```

| Field | Rule |
|---|---|
| `section` | exactly one of: `mathematics1`, `physics`, `chemistry`, `biology`, `mathematics2` |
| `topic` | specific sub-topic (see list below); defaults to `General` |
| `difficulty` | `easy`, `medium`, or `hard` |
| `question` | self-contained, unambiguous; plain-text maths (`^` powers, `*` multiply) |
| `options` | exactly **5** strings |
| `correctIndex` | zero-based index (0–4) of the correct option |
| `explanation` | justifies the answer with the key working |

`id`, `source`, and `createdAt` are assigned by the server — **do not set them
when adding** (but you DO need an `id` to update or delete a specific question —
get it from `list`). Full JSON Schema: `schema.json`.

### Sections and topics

- **mathematics1** — Algebra and functions, Sequences and series, Coordinate geometry, Trigonometry, Exponentials and logarithms, Probability, Statistics
- **physics** — Mechanics and motion, Electricity and circuits, Waves and optics, Energy and work, Thermal physics, Fields and forces, Modern physics
- **chemistry** — Atomic structure, Bonding and structure, Stoichiometry, Energetics, Rates and equilibria, Redox and electrochemistry, Organic chemistry
- **biology** — Cell biology, Genetics and inheritance, Physiology, Ecology, Enzymes and biochemistry, Homeostasis, Evolution
- **mathematics2** — Differentiation, Integration, Further algebra, Graphs and transformations, Vectors, Kinematics, Proof and reasoning

## Authoring rules

1. **Verify every answer** — work the problem and confirm `correctIndex`. Wrong
   keys are the #1 failure.
2. Exactly 5 options; distractors should be plausible (common mistakes).
3. Self-contained; write fresh questions, not verbatim textbook items.
4. Vary topic/difficulty across a batch unless a specific slice is requested.

## Commands (manage.mjs)

### Generate + add

Write the authored questions as a JSON array to a file, then add:

```bash
# /tmp/batch.json = [ { section, topic, difficulty, question, options, correctIndex, explanation }, ... ]
node .claude/skills/esat-content-generator/manage.mjs add /tmp/batch.json
```

### Update (single or bulk)

Each item needs the target `id` plus the fields to overwrite. Get ids from `list`.

```bash
# /tmp/updates.json = [ { "id": "ai-...", "difficulty": "hard" }, { "id": "ai-...", "explanation": "..." } ]
node .claude/skills/esat-content-generator/manage.mjs update /tmp/updates.json
```

### Delete (single or bulk)

```bash
node .claude/skills/esat-content-generator/manage.mjs delete --ids id1,id2,id3
node .claude/skills/esat-content-generator/manage.mjs delete --section physics
node .claude/skills/esat-content-generator/manage.mjs delete --difficulty hard
node .claude/skills/esat-content-generator/manage.mjs delete --topic "Waves and optics"
node .claude/skills/esat-content-generator/manage.mjs delete --all          # removes everything — be careful
```

### List / inspect (to find ids before update/delete)

```bash
node .claude/skills/esat-content-generator/manage.mjs list --section physics --difficulty hard
node .claude/skills/esat-content-generator/manage.mjs list --search "Ohm"
```

## API reference (what manage.mjs calls)

All writes require `Authorization: Bearer <INGEST_TOKEN>`.

| Method & path | Body | Result |
|---|---|---|
| `GET /api/questions?section=&difficulty=&topic=&source=&search=` | — | `{ questions: [...] }` |
| `POST /api/questions/import` | `{ "questions": [ ...schema ] }` | `{ saved, skipped, errors }` |
| `POST /api/questions/update` | `{ "updates": [ { id, ...fields } ] }` | `{ updated, missing }` |
| `POST /api/questions/delete` | `{ "ids": [...] }` \| `{ "section": ... }` \| `{ "all": true }` | `{ deleted }` |

Auth failures return 401; a server with no `INGEST_TOKEN` returns 503 on writes;
an add with nothing valid returns 422.
