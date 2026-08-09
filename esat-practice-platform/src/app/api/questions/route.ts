import { NextResponse } from "next/server";
import { getQuestions } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only listing/filtering. All content is added at runtime through the
// authenticated ingest endpoint (POST /api/questions/import) — there is no
// unauthenticated write path.
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
