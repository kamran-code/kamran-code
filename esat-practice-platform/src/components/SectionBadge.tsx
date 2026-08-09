import { getSection } from "@/lib/esat";

export function SectionBadge({ section }: { section: string }) {
  const s = getSection(section);
  const color = s?.color ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {s?.name ?? section}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const color =
    difficulty === "easy"
      ? "bg-green-100 text-green-700"
      : difficulty === "hard"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-700";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${color}`}
    >
      {difficulty}
    </span>
  );
}
