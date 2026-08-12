import { NextResponse } from "next/server";
import { checkWriteAuth } from "@/lib/ingest";
import { normalizeImage } from "@/lib/figure";
import { updateQuestions } from "@/lib/store";
import type { Question } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Update one or many questions by id (partial fields overwrite).
//   POST /api/questions/update
//   Authorization: Bearer <INGEST_TOKEN>   (or an admin session cookie)
//   { "updates": [ { "id": "...", "difficulty": "hard", ... }, ... ] }
// A single { "id": ..., ...fields } object is also accepted.
export async function POST(request: Request) {
  const auth = checkWriteAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as { updates?: unknown; id?: unknown };
  const list = Array.isArray(b.updates)
    ? b.updates
    : b.id !== undefined
      ? [b]
      : [];

  const updates = list
    .filter(
      (u): u is Partial<Question> & { id: string } =>
        !!u && typeof (u as { id?: unknown }).id === "string",
    )
    .map((u) => {
      // Sanitize any figure being set; allow clearing with an empty/null value.
      if ("image" in u) {
        const clean = { ...u };
        const raw = (u as { image?: unknown }).image;
        if (raw === null || raw === "") clean.image = undefined;
        else {
          const ni = normalizeImage(raw);
          if (ni) clean.image = ni;
          else delete clean.image; // invalid → leave existing untouched
        }
        return clean;
      }
      return u;
    });
  if (updates.length === 0) {
    return NextResponse.json(
      { error: 'Provide "updates": [{ id, ...fields }] (each needs an "id").' },
      { status: 400 },
    );
  }

  const { updated, missing } = await updateQuestions(updates);
  return NextResponse.json({ updated, missing });
}
