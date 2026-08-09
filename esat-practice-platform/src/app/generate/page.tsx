"use client";

import { useMemo, useState } from "react";
import { DIFFICULTIES, SECTIONS, getSection } from "@/lib/esat";
import type { GeneratedQuestion } from "@/lib/types";
import { QuestionCard } from "@/components/QuestionCard";

export default function GeneratePage() {
  const [section, setSection] = useState<string>(SECTIONS[0].id);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(3);
  const [context, setContext] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [results, setResults] = useState<GeneratedQuestion[]>([]);

  const topics = useMemo(() => getSection(section)?.topics ?? [], [section]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    setResults([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, topic, difficulty, count, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed.");
      setResults(data.questions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, questions: results }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">AI Question Generator</h1>
        <p className="mt-1 text-slate-600">
          Generate fresh, exam-style ESAT questions on demand. Optionally paste
          reference material to ground them.
        </p>
      </div>

      <form
        onSubmit={handleGenerate}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Section">
            <select
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                setTopic("");
              }}
              className="input"
            >
              {SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Topic (optional)">
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input"
            >
              <option value="">Any topic</option>
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
              className="input capitalize"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>

          <Field label="How many?">
            <input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="input"
            />
          </Field>
        </div>

        <Field label="Reference material / instructions (optional)">
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            placeholder="Paste a passage, formula sheet, or specific instructions to base the questions on…"
            className="input"
          />
        </Field>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate questions"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              {results.length} generated question(s)
            </h2>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="text-sm font-medium text-green-600">
                  ✓ Saved to your bank
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
              >
                {saving ? "Saving…" : saved ? "Saved" : "Save to bank"}
              </button>
            </div>
          </div>
          {results.map((q, i) => (
            <QuestionCard key={i} question={{ ...q, section }} />
          ))}
        </div>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: rgb(53 99 255);
          box-shadow: 0 0 0 1px rgb(53 99 255);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
