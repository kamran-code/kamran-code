import { promises as fs } from "fs";
import path from "path";
import seed from "@/data/questions.json";
import generated from "@/data/generated.json";
import { SECTIONS } from "./esat";
import type { Question } from "./types";

// Single mutable store. The canonical file lives in ESAT_DATA_DIR (set this to a
// path OUTSIDE the app dir in production, e.g. /var/lib/esat-prep, so it survives
// deploys). On first run it is initialized from the bundled starter content.
// All content is managed at runtime through the API (add / update / delete) —
// there is no other write path.

const DATA_DIR = process.env.ESAT_DATA_DIR || path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "questions.json");

// The platform is scoped to the three modules required for engineering
// (Mathematics 1, Mathematics 2, Physics). Filter the bundled starter content
// to those sections so any legacy Chemistry/Biology seed items never surface.
const VALID_SECTIONS = new Set<string>(SECTIONS.map((s) => s.id));

const BUNDLED_STARTER: Question[] = [
  ...(generated as Question[]),
  ...(seed as Question[]),
].filter((q) => VALID_SECTIONS.has(q.section));

async function fileExists(): Promise<boolean> {
  try {
    await fs.access(FILE);
    return true;
  } catch {
    return false;
  }
}

async function readAll(): Promise<Question[]> {
  if (!(await fileExists())) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(BUNDLED_STARTER, null, 2), "utf8");
    return [...BUNDLED_STARTER];
  }
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as Question[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(questions: Question[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(questions, null, 2), "utf8");
}

export interface QuestionFilter {
  section?: string;
  difficulty?: string;
  topic?: string;
  source?: string;
  search?: string;
}

function matches(q: Question, f: QuestionFilter): boolean {
  if (f.section && q.section !== f.section) return false;
  if (f.difficulty && q.difficulty !== f.difficulty) return false;
  if (f.topic && q.topic !== f.topic) return false;
  if (f.source && q.source !== f.source) return false;
  if (f.search) {
    const hay = `${q.question} ${q.explanation} ${q.topic}`.toLowerCase();
    if (!hay.includes(f.search.trim().toLowerCase())) return false;
  }
  return true;
}

export async function getAllQuestions(): Promise<Question[]> {
  return readAll();
}

export async function getQuestions(filter: QuestionFilter = {}): Promise<Question[]> {
  return (await readAll()).filter((q) => matches(q, filter));
}

/** Append new questions. Returns the number added. */
export async function addQuestions(questions: Question[]): Promise<number> {
  const all = await readAll();
  await writeAll([...questions, ...all]);
  return questions.length;
}

/**
 * Apply partial updates keyed by id. Each update must include `id`; other
 * fields overwrite. Returns counts of updated and not-found ids.
 */
export async function updateQuestions(
  updates: (Partial<Question> & { id: string })[],
): Promise<{ updated: number; missing: string[] }> {
  const all = await readAll();
  const byId = new Map(all.map((q) => [q.id, q]));
  let updated = 0;
  const missing: string[] = [];

  for (const u of updates) {
    const existing = byId.get(u.id);
    if (!existing) {
      missing.push(u.id);
      continue;
    }
    const merged: Question = { ...existing, ...u, id: existing.id };
    // Keep correctIndex valid if options/index changed.
    if (
      !Array.isArray(merged.options) ||
      merged.options.length < 2 ||
      merged.correctIndex < 0 ||
      merged.correctIndex >= merged.options.length
    ) {
      missing.push(`${u.id} (invalid options/correctIndex)`);
      continue;
    }
    byId.set(u.id, merged);
    updated += 1;
  }

  await writeAll([...byId.values()]);
  return { updated, missing };
}

export interface DeleteCriteria {
  ids?: string[];
  section?: string;
  difficulty?: string;
  topic?: string;
  source?: string;
  all?: boolean;
}

/** Delete by ids and/or filter, or everything with `all: true`. Returns count deleted. */
export async function deleteQuestions(criteria: DeleteCriteria): Promise<number> {
  const all = await readAll();
  if (criteria.all) {
    await writeAll([]);
    return all.length;
  }

  const idSet = criteria.ids ? new Set(criteria.ids) : null;
  const hasFilter =
    criteria.section || criteria.difficulty || criteria.topic || criteria.source;
  if (!idSet && !hasFilter) return 0; // nothing specified → no-op (safety)

  const keep = all.filter((q) => {
    const byId = idSet ? idSet.has(q.id) : false;
    const byFilter = hasFilter
      ? matches(q, {
          section: criteria.section,
          difficulty: criteria.difficulty,
          topic: criteria.topic,
          source: criteria.source,
        })
      : false;
    // delete if it matches ids OR the filter
    return !(byId || byFilter);
  });

  const deleted = all.length - keep.length;
  if (deleted > 0) await writeAll(keep);
  return deleted;
}

export async function getStats() {
  const all = await readAll();
  const bySection: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  for (const q of all) {
    bySection[q.section] = (bySection[q.section] ?? 0) + 1;
    byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] ?? 0) + 1;
  }
  return { total: all.length, bySection, byDifficulty };
}
