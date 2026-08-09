import Anthropic from "@anthropic-ai/sdk";
import { getSection } from "./esat";
import type { GeneratedQuestion, GenerateRequest } from "./types";

// Default to Claude Sonnet 5 — a strong, cost-effective choice for high-volume
// MCQ generation. Override with ANTHROPIC_MODEL (e.g. claude-opus-5 for the
// highest quality).
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI generation.");
    this.name = "MissingApiKeyError";
  }
}

// JSON Schema for structured output. Structured outputs do not support
// array length / numeric constraints, so count/option-count are enforced via
// the prompt and validated after the response returns.
const QUESTION_SCHEMA = {
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
} as const;

function buildPrompt(req: GenerateRequest): string {
  const section = getSection(req.section);
  const sectionName = section?.name ?? req.section;
  const topicLine = req.topic
    ? `Focus specifically on the topic: "${req.topic}".`
    : section
      ? `Draw from these topics: ${section.topics.join(", ")}.`
      : "";
  const contextLine = req.context?.trim()
    ? `\n\nBase the questions on the following reference material or instructions:\n"""\n${req.context.trim()}\n"""`
    : "";

  return `You are an expert ESAT (Engineering & Science Admissions Test) exam author.
Generate ${req.count} original, exam-style multiple-choice question(s) for the
"${sectionName}" section at "${req.difficulty}" difficulty.
${topicLine}

Requirements:
- Each question must be self-contained and unambiguous.
- Provide exactly 5 answer options.
- Exactly one option is correct; "correctIndex" is its zero-based position.
- "explanation" must clearly justify the correct answer and the key working.
- Set "topic" to the specific sub-topic and "difficulty" to "${req.difficulty}".
- Do not reuse well-known textbook questions verbatim; write fresh ones.
- Keep mathematics in plain text (use ^ for powers, * for multiplication).${contextLine}`;
}

/**
 * Validate and normalize a model-produced question. Returns null if the
 * question is structurally invalid (e.g. wrong option count, bad index).
 */
function validate(q: GeneratedQuestion): GeneratedQuestion | null {
  if (!q.question?.trim()) return null;
  if (!Array.isArray(q.options) || q.options.length < 2) return null;
  if (
    typeof q.correctIndex !== "number" ||
    q.correctIndex < 0 ||
    q.correctIndex >= q.options.length
  ) {
    return null;
  }
  if (!q.explanation?.trim()) return null;
  return q;
}

export async function generateQuestions(
  req: GenerateRequest,
): Promise<GeneratedQuestion[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: "user", content: buildPrompt(req) }],
    // Structured outputs guarantee schema-valid JSON on supported models.
    output_config: { format: { type: "json_schema", schema: QUESTION_SCHEMA } },
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("The model did not return any content.");
  }

  let parsed: { questions?: GeneratedQuestion[] };
  try {
    parsed = JSON.parse(textBlock.text);
  } catch {
    throw new Error("The model returned malformed JSON.");
  }

  const questions = (parsed.questions ?? [])
    .map(validate)
    .filter((q): q is GeneratedQuestion => q !== null);

  if (questions.length === 0) {
    throw new Error("No valid questions were generated. Try again.");
  }
  return questions;
}
