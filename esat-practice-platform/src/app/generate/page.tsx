"use client";

import { useEffect, useMemo, useState } from "react";
import { DIFFICULTIES, SECTIONS, getSection } from "@/lib/esat";
import { QuestionCard } from "@/components/QuestionCard";

const TOKEN_KEY = "esat_ingest_token";
const EMPTY = ["", "", "", "", ""];

interface Draft {
  section: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function ContentStudioPage() {
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"compose" | "paste">("compose");
  const [batch, setBatch] = useState<Draft[]>([]);
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<
    { saved: number; skipped: number; errors: string[] } | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Load the ingest token from localStorage (never committed / never on server).
  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  function saveToken(v: string) {
    setToken(v);
    localStorage.setItem(TOKEN_KEY, v);
  }

  async function pushBatch() {
    setPushing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/questions/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questions: batch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Push failed.");
      setResult({
        saved: data.saved ?? 0,
        skipped: data.skipped ?? 0,
        errors: data.errors ?? [],
      });
      if ((data.saved ?? 0) > 0) setBatch([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Push failed.");
    } finally {
      setPushing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Content Studio</h1>
        <p className="mt-1 text-slate-600">
          Create questions in the UI (or paste an AI-generated batch), then push
          them to the live bank through the ingest API — no redeploy.
        </p>
      </div>

      {/* Token */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          Ingest token (stored only in this browser)
        </label>
        <input
          type="password"
          value={token}
          onChange={(e) => saveToken(e.target.value)}
          placeholder="Paste your INGEST_TOKEN"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <p className="mt-1 text-xs text-slate-400">
          Required to push. It authorizes writes to your question bank — keep it
          private.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <TabButton active={mode === "compose"} onClick={() => setMode("compose")}>
          Compose
        </TabButton>
        <TabButton active={mode === "paste"} onClick={() => setMode("paste")}>
          Paste JSON
        </TabButton>
      </div>

      {mode === "compose" ? (
        <ComposeForm onAdd={(d) => setBatch((b) => [...b, d])} />
      ) : (
        <PasteForm
          onAdd={(items) => setBatch((b) => [...b, ...items])}
          onError={setError}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Batch */}
      {batch.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Batch ({batch.length})
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBatch([])}
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
              <button
                onClick={pushBatch}
                disabled={pushing || !token}
                className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-50"
                title={!token ? "Enter your ingest token first" : undefined}
              >
                {pushing ? "Pushing…" : `Push ${batch.length} to server`}
              </button>
            </div>
          </div>
          {batch.map((q, i) => (
            <div key={i} className="relative">
              <button
                onClick={() => setBatch((b) => b.filter((_, j) => j !== i))}
                className="absolute right-3 top-3 z-10 rounded-md bg-white/80 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Remove
              </button>
              <QuestionCard question={q} />
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          ✓ Pushed <strong>{result.saved}</strong> question(s)
          {result.skipped > 0 && <> · skipped {result.skipped}</>}.{" "}
          <a href="/practice" className="font-medium underline">
            View in the bank →
          </a>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-red-700">
              {result.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-brand-600 text-white"
          : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function ComposeForm({ onAdd }: { onAdd: (d: Draft) => void }) {
  const [section, setSection] = useState<string>(SECTIONS[0].id);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>([...EMPTY]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const topics = useMemo(() => getSection(section)?.topics ?? [], [section]);

  function add() {
    const opts = options.map((o) => o.trim());
    if (!question.trim()) return setErr("Question text is required.");
    if (opts.some((o) => !o)) return setErr("All 5 options must be filled in.");
    if (!explanation.trim()) return setErr("An explanation is required.");
    setErr(null);
    onAdd({
      section,
      topic: topic.trim() || "General",
      difficulty,
      question: question.trim(),
      options: opts,
      correctIndex,
      explanation: explanation.trim(),
    });
    setQuestion("");
    setOptions([...EMPTY]);
    setCorrectIndex(0);
    setExplanation("");
  }

  const cls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Section</label>
          <select value={section} onChange={(e) => { setSection(e.target.value); setTopic(""); }} className={cls}>
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Topic</label>
          <input list="topics" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Optional" className={cls} />
          <datalist id="topics">
            {topics.map((t) => <option key={t} value={t} />)}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Difficulty</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={`${cls} capitalize`}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Question</label>
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} className={cls} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          Options (select the correct one)
        </label>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                checked={correctIndex === i}
                onChange={() => setCorrectIndex(i)}
                className="h-4 w-4 accent-brand-600"
                title="Mark as correct"
              />
              <span className="w-5 text-sm font-semibold text-slate-500">
                {String.fromCharCode(65 + i)}.
              </span>
              <input
                value={opt}
                onChange={(e) =>
                  setOptions((o) => o.map((v, j) => (j === i ? e.target.value : v)))
                }
                className={cls}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Explanation</label>
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} className={cls} />
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button onClick={add} className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
        Add to batch
      </button>
    </div>
  );
}

function PasteForm({
  onAdd,
  onError,
}: {
  onAdd: (items: Draft[]) => void;
  onError: (msg: string | null) => void;
}) {
  const [text, setText] = useState("");

  function load() {
    onError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return onError("That isn't valid JSON.");
    }
    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed as { questions?: unknown }).questions;
    if (!Array.isArray(arr) || arr.length === 0) {
      return onError('Expected a JSON array, or { "questions": [ ... ] }.');
    }
    // Light client-side shaping; the server validates authoritatively on push.
    const items = arr.map((raw) => {
      const q = raw as Record<string, unknown>;
      return {
        section: String(q.section ?? ""),
        topic: String(q.topic ?? "General"),
        difficulty: String(q.difficulty ?? "medium"),
        question: String(q.question ?? ""),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctIndex: Number(q.correctIndex ?? 0),
        explanation: String(q.explanation ?? ""),
      } as Draft;
    });
    onAdd(items);
    setText("");
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-600">
        Paste a JSON array of questions (e.g. generated by Claude via the{" "}
        <code className="rounded bg-slate-100 px-1">esat-content-generator</code>{" "}
        skill). Each item needs <code>section</code>, <code>difficulty</code>,{" "}
        <code>question</code>, <code>options</code> (5), <code>correctIndex</code>,{" "}
        <code>explanation</code>.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder='[{ "section": "physics", "topic": "...", "difficulty": "medium", "question": "...", "options": ["...","...","...","...","..."], "correctIndex": 2, "explanation": "..." }]'
        className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
      <button onClick={load} className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
        Load into batch
      </button>
    </div>
  );
}
