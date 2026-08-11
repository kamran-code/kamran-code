---
name: esat-content-generator
description: >-
  Generate and manage ESAT (Engineering & Science Admissions Test) practice
  questions for the ESAT Practice Platform. Authors exam-accurate questions in
  the exact JSON schema for Mathematics 1, Physics, and Mathematics 2, and adds,
  updates, or deletes them (single or bulk) through the app's authenticated API.
  Use when asked to create, write, add, edit, fix, or remove ESAT/practice/exam
  questions, or to manage the question bank.
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

## Scope: three modules only

This platform targets the three ESAT modules required for **engineering** (e.g.
Cambridge/Imperial), and generates **only** these:

- `mathematics1` — Mathematics 1
- `physics` — Physics
- `mathematics2` — Mathematics 2

Chemistry and Biology are **out of scope** — do not author them; the server
rejects them.

## What the real ESAT is (author to this)

The ESAT is administered by **UAT-UK** (University Admissions Tests, delivered
via Pearson VUE) and replaced the NSAA/ENGAA from 2024 entry. Match its style:

- **Format:** each module has **27 multiple-choice questions in 40 minutes**,
  separately timed. Computer-based.
- **No calculator.** Every question must be solvable by hand — use clean numbers,
  exact surds/fractions/multiples of π, and arithmetic that works out neatly.
- **Marking:** 1 mark per correct answer, **no negative marking**.
- **Style:** questions test applied understanding. Mix straightforward
  knowledge-application items with ones needing creative problem-solving in less
  familiar contexts. Keep them concise and unambiguous.
- **SI units** with standard prefixes (nano…giga) and negative-index units
  (e.g. `m s^-1`). Take `g = 10 N kg^-1` on Earth (as the spec does).
- All modules **assume Mathematics 1** knowledge; Mathematics 2 additionally
  assumes the advanced-maths content.

### Reference papers for style (author fresh — never copy)

Draw on the style/difficulty of legacy admissions papers, but always write
**new** questions:

- **Mathematics 1** — TMUA, ENGAA Section 1 (maths), NSAA maths, ECAA maths.
- **Mathematics 2** — NSAA Advanced Maths (the "Advanced Maths & Physics"
  section), PAT (maths), ENGAA advanced.
- **Physics** — ENGAA physics, NSAA Physics (Advanced Maths & Physics section),
  PAT physics.

## Configuration

Credentials are **bundled** in `secrets.local.json` next to this file, so the
skill works with no setup:

- `ESAT_API_URL` = `https://sourceopen.in`
- `ESAT_INGEST_TOKEN` = the server's write token (already filled in)

Environment variables `ESAT_API_URL` / `ESAT_INGEST_TOKEN` override the bundled
file if set. This zip contains a live write token for a shared test project —
treat it as sensitive and don't redistribute beyond your trusted group.

Runtime: needs **Claude Code / the Claude desktop "Code" option** (or any place
with Node + internet). It will not push from claude.ai consumer chat, whose code
sandbox has no outbound network.

All commands below run as `node <this-skill-dir>/manage.mjs …` (when installed at
`~/.claude/skills/esat-content-generator/`, that is
`node ~/.claude/skills/esat-content-generator/manage.mjs …`).

## The exact JSON schema

A question object (a batch is an array of these):

```json
{
  "section": "physics",
  "topic": "Electricity",
  "difficulty": "medium",
  "question": "A 5 ohm resistor carries a current of 2 A. What is the potential difference across it?",
  "options": ["2.5 V", "7 V", "10 V", "0.4 V", "20 V"],
  "correctIndex": 2,
  "explanation": "By Ohm's law, V = I * R = 2 * 5 = 10 V."
}
```

| Field | Rule |
|---|---|
| `section` | exactly one of: `mathematics1`, `physics`, `mathematics2` |
| `topic` | specific sub-topic (see list below); defaults to `General` |
| `difficulty` | `easy`, `medium`, or `hard` |
| `question` | self-contained, unambiguous; plain-text maths (`^` powers, `*` multiply, `sqrt()`), no calculator needed |
| `options` | **4–8** strings (ESAT varies the count; 5 is a fine default) |
| `correctIndex` | zero-based index of the correct option (0 to `options.length - 1`) |
| `explanation` | justifies the answer with the key working |

`id`, `source`, and `createdAt` are assigned by the server — **do not set them
when adding** (but you DO need an `id` to update or delete a specific question —
get it from `list`). Full JSON Schema: `schema.json`.

### Sections and topics (official ESAT specification headings)

- **mathematics1** — Units; Number; Ratio and proportion; Algebra; Geometry;
  Statistics; Probability
- **physics** — Electricity; Magnetism; Mechanics; Thermal physics; Matter;
  Waves; Radioactivity
- **mathematics2** — Algebra and functions; Sequences and series; Coordinate
  geometry; Trigonometry; Exponentials and logarithms; Differentiation;
  Integration; Graphs of functions

Use these exact topic strings so the app's filters and quiz selection line up.

## Authoring rules

1. **Verify every answer** — work the problem and confirm `correctIndex`. Wrong
   keys are the #1 failure.
2. **No calculator** — numbers must resolve cleanly by hand (nice integers, exact
   surds/fractions, multiples of π).
3. Use **4–8 options** (match the real exam; 5 is a sensible default). Set
   `correctIndex` to the right one; distractors should be plausible (common
   mistakes, sign slips, unit errors, off-by-one).
4. Self-contained; write fresh questions in ESAT style, not verbatim textbook or
   past-paper items.
5. Vary topic/difficulty across a batch unless a specific slice is requested.
6. Since diagrams can't be embedded, describe any needed setup in words (or avoid
   diagram-dependent items).

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
node .claude/skills/esat-content-generator/manage.mjs delete --topic "Waves"
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
an add with nothing valid (e.g. an out-of-scope section) returns 422.
