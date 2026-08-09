import { NextResponse } from "next/server";
import { getQuestions, saveQuestions } from "@/lib/store";
import type { GeneratedQuestion, Question } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const questions = await getQuestions({
    section: searchParams.get("section") ?? undefined,
    difficulty: searchParams.get("difficulty") ?? undefined,
    topic: searchParams.get("topic") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    search: searchParams.get("search") ?? undefined,
  });
  return NextResponse.json({ questions });
}

// Persist a batch of AI-generated questions into the store.
export async function POST(request: Request) {
  let body: { section?: string; questions?: GeneratedQuestion[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const section = String(body.section ?? "").trim();
  const incoming = Array.isArray(body.questions) ? body.questions : [];
  if (!section || incoming.length === 0) {
    return NextResponse.json(
      { error: "A section and at least one question are required." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const toSave: Question[] = incoming.map((q, i) => ({
    id: `ai-${Date.now()}-${i}`,
    section,
    topic: q.topic || "General",
    difficulty: q.difficulty || "medium",
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    source: "ai",
    createdAt: now,
  }));

  await saveQuestions(toSave);
  return NextResponse.json({ saved: toSave.length });
}
