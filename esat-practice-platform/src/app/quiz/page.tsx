"use client";

import { useState } from "react";
import { DIFFICULTIES, SECTIONS } from "@/lib/esat";
import type { Question } from "@/lib/types";
import { QuizRunner } from "@/components/QuizRunner";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizPage() {
  const [section, setSection] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Question[] | null>(null);

  async function startQuiz(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (section) query.set("section", section);
      if (difficulty) query.set("difficulty", difficulty);
      const res = await fetch(`/api/questions?${query.toString()}`);
      const data = await res.json();
      const pool: Question[] = data.questions ?? [];
      if (pool.length === 0) {
        setError("No questions available for these filters. Generate some first.");
        return;
      }
      setQuiz(shuffle(pool).slice(0, count));
    } catch {
      setError("Could not load questions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (quiz) {
    return <QuizRunner questions={quiz} onRestart={() => setQuiz(null)} />;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Take a Quiz</h1>
        <p className="mt-1 text-slate-600">
          Build a quiz from the question bank. Answer, check, and get scored with
          explanations at the end.
        </p>
      </div>

      <form
        onSubmit={startQuiz}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Section
          </label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All sections (mixed)</option>
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
          >
            <option value="">Any difficulty</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">
            Number of questions
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Building quiz…" : "Start quiz"}
        </button>
      </form>
    </div>
  );
}
