import { promises as fs } from "fs";
import path from "path";
import seed from "@/data/questions.json";
import committedGenerated from "@/data/generated.json";
import type { Question } from "./types";

// Three content sources, in priority order:
//   1. committed generated bank (src/data/generated.json) — produced offline by
//      `npm run generate` (or authored by hand) and shipped via git/CI. This is
//      how content reaches production WITHOUT an API key on the server.
//   2. runtime file (data/generated.json at cwd) — written by the optional
//      on-server /api/generate flow, only if an API key is present. Survives a
//      dev restart; not required in production.
//   3. bundled seed content (src/data/questions.json).

// Runtime data location. In production set ESAT_DATA_DIR to a path OUTSIDE the
// app dir (e.g. /var/lib/esat-prep) so pushed content survives deploys, which
// rsync --delete the app dir.
const DATA_DIR = process.env.ESAT_DATA_DIR || path.join(process.cwd(), "data");
const GENERATED_FILE = path.join(DATA_DIR, "generated.json");

const seedQuestions = seed as Question[];
const committedQuestions = committedGenerated as Question[];

async function readGenerated(): Promise<Question[]> {
  try {
    const raw = await fs.readFile(GENERATED_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Question[]) : [];
  } catch {
    return [];
  }
}

async function writeGenerated(questions: Question[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(GENERATED_FILE, JSON.stringify(questions, null, 2), "utf8");
}

export interface QuestionFilter {
  section?: string;
  difficulty?: string;
  topic?: string;
  source?: string;
  search?: string;
}

export async function getAllQuestions(): Promise<Question[]> {
  const runtime = await readGenerated();
  // Runtime-saved first, then the committed generated bank, then seed content.
  return [...runtime, ...committedQuestions, ...seedQuestions];
}

export async function getQuestions(
  filter: QuestionFilter = {},
): Promise<Question[]> {
  const all = await getAllQuestions();
  const search = filter.search?.trim().toLowerCase();
  return all.filter((q) => {
    if (filter.section && q.section !== filter.section) return false;
    if (filter.difficulty && q.difficulty !== filter.difficulty) return false;
    if (filter.topic && q.topic !== filter.topic) return false;
    if (filter.source && q.source !== filter.source) return false;
    if (search) {
      const haystack = `${q.question} ${q.explanation} ${q.topic}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export async function saveQuestions(questions: Question[]): Promise<void> {
  const generated = await readGenerated();
  await writeGenerated([...questions, ...generated]);
}

export async function getStats() {
  const all = await getAllQuestions();
  const bySection: Record<string, number> = {};
  let aiCount = 0;
  for (const q of all) {
    bySection[q.section] = (bySection[q.section] ?? 0) + 1;
    if (q.source === "ai") aiCount += 1;
  }
  return { total: all.length, aiCount, bySection };
}
