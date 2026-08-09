---
name: esat-content-generator
description: >-
  Generate ESAT (Engineering & Science Admissions Test) practice questions in
  the exact JSON schema the ESAT Practice Platform uses, and optionally push
  them straight to the running app's ingest API. Use when asked to create,
  write, or add ESAT/practice/exam questions for Maths 1, Physics, Chemistry,
  Biology, or Maths 2, or to populate the question bank.
---

# ESAT Content Generator

Author exam-style ESAT multiple-choice questions in the platform's exact schema,
then **push them to the live app's authenticated ingest endpoint**. Content is
added at runtime — no redeploy, no committing data files.

You (the model) do the authoring — no Anthropic API key is required anywhere.

## The exact JSON schema

Each question is an object. A batch is an array of them.

```json
{
  "section": "physics",
  "topic": "Electricity and circuits",
  "difficulty": "medium",
  "question": "A resistor of 5 ohm carries a current of 2 A. What is the potential difference across it?",
  "options": ["2.5 V", "7 V", "10 V", "0.4 V", "20 V"],
  "correctIndex": 2,
  "explanation": "By Ohm's law, V = I * R = 2 * 5 = 10 V.",
  "difficulty": "medium"
}
```

Field rules:

| Field | Type | Rule |
|---|---|---|
| `section` | string | One of exactly: `mathematics1`, `physics`, `chemistry`, `biology`, `mathematics2` |
| `topic` | string | Specific sub-topic (see list below); defaults to `General` if omitted |
| `difficulty` | string | `easy`, `medium`, or `hard` |
| `question` | string | Self-contained, unambiguous. Plain-text maths: `^` for powers, `*` for multiply |
| `options` | string[] | Exactly **5** options |
| `correctIndex` | integer | Zero-based index of the correct option (0–4) |
| `explanation` | string | Justify the answer and show the key working |

`id`, `source`, and `createdAt` are assigned by the server/pipeline — **do not
set them**. A full reference schema is in `schema.json`.

## Sections and topics

- **mathematics1** — Algebra and functions, Sequences and series, Coordinate geometry, Trigonometry, Exponentials and logarithms, Probability, Statistics
- **physics** — Mechanics and motion, Electricity and circuits, Waves and optics, Energy and work, Thermal physics, Fields and forces, Modern physics
- **chemistry** — Atomic structure, Bonding and structure, Stoichiometry, Energetics, Rates and equilibria, Redox and electrochemistry, Organic chemistry
- **biology** — Cell biology, Genetics and inheritance, Physiology, Ecology, Enzymes and biochemistry, Homeostasis, Evolution
- **mathematics2** — Differentiation, Integration, Further algebra, Graphs and transformations, Vectors, Kinematics, Proof and reasoning

## Authoring rules (important)

1. **Verify every answer.** Work the problem, confirm `correctIndex` points at
   the correct option. Wrong keys are the #1 failure — double-check the maths.
2. Exactly 5 options; make distractors plausible (common mistakes), not filler.
3. Keep each question self-contained; no "see above" or figures that aren't
   described in text.
4. Write fresh questions — do not copy known textbook items verbatim.
5. Vary difficulty and topic across a batch unless asked for a specific slice.

## Workflow

1. Write the requested questions as a JSON **array** to a file, e.g.
   `/tmp/esat-batch.json`, following the schema exactly.
2. Push them to the live app:

Requires two environment variables:
- `ESAT_INGEST_TOKEN` — the server's `INGEST_TOKEN` secret (never hardcode it).
- `ESAT_API_URL` — base URL of the app. Defaults to `http://76.13.240.125`.

```bash
ESAT_INGEST_TOKEN=... node .claude/skills/esat-content-generator/push.mjs /tmp/esat-batch.json
```

`push.mjs` POSTs to `POST {ESAT_API_URL}/api/questions/import` with
`Authorization: Bearer $ESAT_INGEST_TOKEN` and body `{ "questions": [...] }`.
The endpoint validates each question, appends valid ones to the live bank, and
returns `{ saved, skipped, errors }`. New questions appear immediately — no
deploy needed.

> Content is only ever added through this endpoint (or the in-app Content
> Studio, which posts to the same endpoint). There is no commit-a-data-file
> path.

## The ingest endpoint (reference)

```
POST {ESAT_API_URL}/api/questions/import
Authorization: Bearer <INGEST_TOKEN>
Content-Type: application/json

{ "questions": [ { section, topic, difficulty, question, options, correctIndex, explanation }, ... ] }

→ 200 { "saved": <n>, "skipped": <m>, "errors": [ "#i: reason", ... ] }
→ 401 if the token is missing/wrong
→ 503 if the server has no INGEST_TOKEN configured
→ 422 if no question was valid
```
