#!/usr/bin/env node
//
// Offline ESAT question generator.
//
// Generates exam-style questions with the Anthropic API and appends them to the
// committed bank at src/data/generated.json. Run this wherever your API key
// lives (your machine or CI) — NOT on the production server. Commit the result
// and let CI/CD ship it, so the server never needs an Anthropic key.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate.mjs \
//     --section physics --topic "Electricity and circuits" \
//     --difficulty medium --count 5
//
// Flags:
//   --section     (required) one of: mathematics1 physics chemistry biology mathematics2
//   --difficulty  easy | medium | hard        (default: medium)
//   --count       1-20                          (default: 5)
//   --topic       optional sub-topic string
//   --context     optional reference text to ground the questions
//   --model       override model (default: $ANTHROPIC_MODEL or claude-sonnet-5)
//   --dry-run     print generated questions without writing the file
//
import Anthropic from "@anthropic-ai/sdk";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BANK = path.join(__dirname, "..", "src", "data", "generated.json");

const SECTIONS = {
  mathematics1: "Mathematics 1",
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  mathematics2: "Mathematics 2",
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (key === "dry-run") {
        args.dryRun = true;
      } else {
        args[key] = argv[++i];
      }
    }
  }
  return args;
}

const SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correctIndex: { type: "integer" },
          explanation: { type: "string" },
          topic: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        },
        required: [
          "question",
          "options",
          "correctIndex",
          "explanation",
          "topic",
          "difficulty",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

function buildPrompt({ section, topic, difficulty, count, context }) {
  const name = SECTIONS[section] ?? section;
  const topicLine = topic ? `Focus specifically on the topic: "${topic}".` : "";
  const contextLine = context
    ? `\n\nBase the questions on this reference material:\n"""\n${context}\n"""`
    : "";
  return `You are an expert ESAT (Engineering & Science Admissions Test) exam author.
Generate ${count} original, exam-style multiple-choice question(s) for the
"${name}" section at "${difficulty}" difficulty.
${topicLine}

Requirements:
- Each question must be self-contained and unambiguous.
- Provide exactly 5 answer options.
- Exactly one option is correct; "correctIndex" is its zero-based position.
- "explanation" must clearly justify the correct answer and the key working.
- Set "topic" to the specific sub-topic and "difficulty" to "${difficulty}".
- Do not reuse well-known textbook questions verbatim; write fresh ones.
- Keep mathematics in plain text (use ^ for powers, * for multiplication).${contextLine}`;
}

function validate(q) {
  if (!q || typeof q.question !== "string" || !q.question.trim()) return false;
  if (!Array.isArray(q.options) || q.options.length < 2) return false;
  if (
    typeof q.correctIndex !== "number" ||
    q.correctIndex < 0 ||
    q.correctIndex >= q.options.length
  )
    return false;
  if (typeof q.explanation !== "string" || !q.explanation.trim()) return false;
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const section = args.section;
  const difficulty = args.difficulty ?? "medium";
  const count = Math.min(Math.max(Number(args.count ?? 5), 1), 20);
  const model = args.model || process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  if (!section || !SECTIONS[section]) {
    console.error(
      `Error: --section is required and must be one of: ${Object.keys(SECTIONS).join(", ")}`,
    );
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is not set in the environment.");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.error(`Generating ${count} "${difficulty}" question(s) for ${SECTIONS[section]} using ${model}...`);
  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: buildPrompt({
          section,
          topic: args.topic,
          difficulty,
          count,
          context: args.context,
        }),
      },
    ],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) {
    console.error("Error: model returned no content.");
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    console.error("Error: model returned malformed JSON.");
    process.exit(1);
  }

  const valid = (parsed.questions ?? []).filter(validate);
  if (valid.length === 0) {
    console.error("Error: no valid questions were generated.");
    process.exit(1);
  }

  const now = new Date().toISOString();
  const stamp = Date.now();
  const newQuestions = valid.map((q, i) => ({
    id: `ai-gen-${stamp}-${i}`,
    section,
    topic: q.topic || args.topic || "General",
    difficulty: q.difficulty || difficulty,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    source: "ai",
    createdAt: now,
  }));

  if (args.dryRun) {
    console.log(JSON.stringify(newQuestions, null, 2));
    console.error(`\n(dry run — ${newQuestions.length} question(s) not written)`);
    return;
  }

  let existing = [];
  try {
    existing = JSON.parse(await readFile(BANK, "utf8"));
    if (!Array.isArray(existing)) existing = [];
  } catch {
    existing = [];
  }

  const merged = [...newQuestions, ...existing];
  await writeFile(BANK, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.error(
    `Added ${newQuestions.length} question(s). Bank now has ${merged.length}.`,
  );
  console.error("Next: commit src/data/generated.json and push — CI will deploy it.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
