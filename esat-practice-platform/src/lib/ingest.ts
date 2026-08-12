import { SECTIONS } from "./esat";
import { isAdminRequest } from "./auth";
import { normalizeImage } from "./figure";
import type { Question } from "./types";

const VALID_SECTIONS = new Set<string>(SECTIONS.map((s) => s.id));
const VALID_DIFFICULTY = new Set(["easy", "medium", "hard"]);

/**
 * Authorize a write request. Two accepted credentials:
 * - the skill / API clients send `Authorization: Bearer <INGEST_TOKEN>`
 *   (or `x-ingest-token`);
 * - the dashboard UI sends a valid admin session cookie.
 * If neither `INGEST_TOKEN` nor the dashboard password is configured, writes are
 * allowed in dev but blocked in production (never an open writer).
 */
export function checkWriteAuth(
  request: Request,
): { ok: true } | { ok: false; status: number; error: string } {
  if (isAdminRequest(request)) return { ok: true };

  const token = process.env.INGEST_TOKEN;
  if (token) {
    const header = request.headers.get("authorization") || "";
    const provided = header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : (request.headers.get("x-ingest-token") || "").trim();
    if (!provided || provided !== token) {
      return { ok: false, status: 401, error: "Unauthorized: missing or invalid token." };
    }
    return { ok: true };
  }
  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      status: 503,
      error: "Content writes are disabled: set INGEST_TOKEN on the server to enable them.",
    };
  }
  return { ok: true };
}

/**
 * Validate and normalize one incoming question into the canonical schema.
 * Returns a ready-to-store Question, or an error string describing why it was
 * rejected.
 */
export function normalizeQuestion(
  raw: unknown,
  index: number,
): { ok: true; question: Question } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: `#${index}: not an object` };
  }
  const q = raw as Record<string, unknown>;

  const question = typeof q.question === "string" ? q.question.trim() : "";
  if (!question) return { ok: false, error: `#${index}: missing "question"` };

  const section = String(q.section ?? "");
  if (!VALID_SECTIONS.has(section)) {
    return {
      ok: false,
      error: `#${index}: invalid section "${section}" (expected one of ${[...VALID_SECTIONS].join(", ")})`,
    };
  }

  if (!Array.isArray(q.options) || q.options.length < 2) {
    return { ok: false, error: `#${index}: "options" must be an array of 2+ items` };
  }
  const options = q.options.map((o) => String(o));

  const correctIndex = Number(q.correctIndex);
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
    return { ok: false, error: `#${index}: "correctIndex" out of range` };
  }

  const explanation = typeof q.explanation === "string" ? q.explanation.trim() : "";
  if (!explanation) return { ok: false, error: `#${index}: missing "explanation"` };

  const difficulty = VALID_DIFFICULTY.has(String(q.difficulty))
    ? String(q.difficulty)
    : "medium";
  const topic =
    typeof q.topic === "string" && q.topic.trim() ? q.topic.trim() : "General";
  const id =
    typeof q.id === "string" && q.id.trim()
      ? q.id.trim()
      : `ai-import-${Date.now()}-${index}`;

  const image = normalizeImage(q.image);
  const imageAlt =
    image && typeof q.imageAlt === "string" && q.imageAlt.trim()
      ? q.imageAlt.trim()
      : undefined;

  return {
    ok: true,
    question: {
      id,
      section,
      topic,
      difficulty,
      question,
      options,
      correctIndex,
      explanation,
      ...(image ? { image } : {}),
      ...(imageAlt ? { imageAlt } : {}),
      source: q.source === "seed" ? "seed" : "ai",
      createdAt: new Date().toISOString(),
    },
  };
}
