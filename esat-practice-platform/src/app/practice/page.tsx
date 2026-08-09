"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DIFFICULTIES, SECTIONS } from "@/lib/esat";
import type { Question } from "@/lib/types";
import { QuestionCard } from "@/components/QuestionCard";

function PracticeInner() {
  const params = useSearchParams();
  const [section, setSection] = useState(params.get("section") ?? "");
  const [difficulty, setDifficulty] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (section) query.set("section", section);
    if (difficulty) query.set("difficulty", difficulty);
    if (source) query.set("source", source);
    if (search) query.set("search", search);

    setLoading(true);
    fetch(`/api/questions?${query.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => setQuestions(data.questions ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") setQuestions([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [section, difficulty, source, search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Practice Bank</h1>
        <p className="mt-1 text-slate-600">
          Browse stored and AI-generated questions. Filter by section,
          difficulty, or search the text.
        </p>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Section"
          value={section}
          onChange={setSection}
          options={[
            { value: "", label: "All sections" },
            ...SECTIONS.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <Select
          label="Difficulty"
          value={difficulty}
          onChange={setDifficulty}
          options={[
            { value: "", label: "All difficulties" },
            ...DIFFICULTIES.map((d) => ({ value: d, label: d })),
          ]}
        />
        <Select
          label="Source"
          value={source}
          onChange={setSource}
          options={[
            { value: "", label: "All sources" },
            { value: "seed", label: "Curated" },
            { value: "ai", label: "AI-generated" },
          ]}
        />
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Search
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search text..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {loading ? "Loading…" : `${questions.length} question(s)`}
      </p>

      <div className="space-y-4">
        {!loading && questions.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No questions match these filters. Try the{" "}
            <a href="/generate" className="font-medium text-brand-600 underline">
              AI generator
            </a>{" "}
            to create some.
          </div>
        )}
        {questions.map((q) => (
          <QuestionCard key={q.id} question={q} />
        ))}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <PracticeInner />
    </Suspense>
  );
}
