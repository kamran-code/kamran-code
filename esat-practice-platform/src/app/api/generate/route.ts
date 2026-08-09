import { NextResponse } from "next/server";
import { generateQuestions, MissingApiKeyError } from "@/lib/anthropic";
import type { GenerateRequest } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Partial<GenerateRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const section = String(body.section ?? "").trim();
  const difficulty = String(body.difficulty ?? "medium").trim();
  const count = Math.min(Math.max(Number(body.count ?? 3), 1), 10);

  if (!section) {
    return NextResponse.json({ error: "A section is required." }, { status: 400 });
  }

  try {
    const questions = await generateQuestions({
      section,
      difficulty,
      count,
      topic: body.topic ? String(body.topic) : undefined,
      context: body.context ? String(body.context) : undefined,
    });
    return NextResponse.json({ questions });
  } catch (err) {
    if (err instanceof MissingApiKeyError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
