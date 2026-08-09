"use client";

import { useMemo, useState } from "react";
import { DIFFICULTIES, SECTIONS, getSection } from "@/lib/esat";
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

export default function HomeQuizPage() {
  const [section, setSection] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<Question[] | null>(null);

  const topics = useMemo(
    () => (section ? getSection(section)?.topics ?? [] : []),
    [section],
  );

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (section) query.set("section", section);
      if (difficulty) query.set("difficulty", difficulty);
      if (topic) query.set("topic", topic);
      const res = await fetch(`/api/questions?${query.toString()}`);
      const data = await res.json();
      const pool: Question[] = data.questions ?? [];
      if (pool.length === 0) {
        setError("No questions match this selection yet. Try a broader filter.");
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
    return (
      <div className="mx-auto max-w-3xl">
        <QuizRunner questions={quiz} onRestart={() => setQuiz(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 px-8 py-10 text-white">
        <h1 className="text-3xl font-bold">ESAT Practice Quiz</h1>
        <p className="mt-2 text-brand-50">
          Choose a section and topic, then start. You&apos;ll get instant scoring
          and explanations at the end.
        </p>
      </section>

      <form
        onSubmit={start}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Section">
            <select
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setTopic("");
              }}
              className={INPUT}
            >
              <option value="">All sections (mixed)</option>
              {SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Topic">
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={!section}
              className={INPUT}
            >
              <option value="">
                {section ? "All topics" : "Select a section first"}
              </option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Difficulty">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={`${INPUT} capitalize`}
            >
              <option value="">Any difficulty</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Number of questions">
            <input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className={INPUT}
            />
          </Field>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Start quiz"}
        </button>
      </form>
    </div>
  );
}

const INPUT =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-400";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
