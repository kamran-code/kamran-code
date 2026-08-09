import { NextResponse } from "next/server";
import { checkWriteAuth, normalizeQuestion } from "@/lib/ingest";
import { saveQuestions } from "@/lib/store";
import type { Question } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Authenticated ingest endpoint. Accepts a batch of questions in the exact
// app schema and appends them to the runtime bank. Used by the ESAT content
// skill's push script for auto-push without a redeploy.
//
//   POST /api/questions/import
//   Authorization: Bearer <INGEST_TOKEN>
//   { "questions": [ { ...Question }, ... ] }
export async function POST(request: Request) {
  const auth = checkWriteAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { questions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const incoming = Array.isArray(body.questions) ? body.questions : [];
  if (incoming.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty \"questions\" array." },
      { status: 400 },
    );
  }

  const valid: Question[] = [];
  const errors: string[] = [];
  incoming.forEach((raw, i) => {
    const result = normalizeQuestion(raw, i);
    if (result.ok) valid.push(result.question);
    else errors.push(result.error);
  });

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "No valid questions.", saved: 0, skipped: errors.length, errors },
      { status: 422 },
    );
  }

  await saveQuestions(valid);
  return NextResponse.json({ saved: valid.length, skipped: errors.length, errors });
}
