import { NextResponse } from "next/server";
import { checkWriteAuth } from "@/lib/ingest";
import { deleteQuestions } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Delete questions by ids and/or filter, or everything with { "all": true }.
//   POST /api/questions/delete
//   Authorization: Bearer <INGEST_TOKEN>   (or an admin session cookie)
//   { "ids": ["..."] }  |  { "section": "physics" }  |  { "all": true }
export async function POST(request: Request) {
  const auth = checkWriteAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: {
    ids?: unknown;
    section?: string;
    difficulty?: string;
    topic?: string;
    source?: string;
    all?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.map(String) : undefined;
  const hasCriteria =
    body.all || ids?.length || body.section || body.difficulty || body.topic || body.source;
  if (!hasCriteria) {
    return NextResponse.json(
      { error: 'Specify "ids", a filter (section/difficulty/topic/source), or { "all": true }.' },
      { status: 400 },
    );
  }

  const deleted = await deleteQuestions({
    ids,
    section: body.section,
    difficulty: body.difficulty,
    topic: body.topic,
    source: body.source,
    all: body.all,
  });
  return NextResponse.json({ deleted });
}
