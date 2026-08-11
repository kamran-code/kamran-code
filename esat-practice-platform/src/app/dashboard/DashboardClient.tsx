"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DIFFICULTIES, SECTIONS } from "@/lib/esat";
import type { Question } from "@/lib/types";
import { DifficultyBadge, SectionBadge } from "@/components/SectionBadge";

interface Stats {
  total: number;
  bySection: Record<string, number>;
  byDifficulty: Record<string, number>;
}

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export default function DashboardClient({ initialStats }: { initialStats: Stats }) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>(initialStats);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  // filters
  const [section, setSection] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (section) query.set("section", section);
    if (difficulty) query.set("difficulty", difficulty);
    if (source) query.set("source", source);
    if (search) query.set("search", search);
    const [qRes, sRes] = await Promise.all([
      fetch(`/api/questions?${query.toString()}`),
      fetch(`/api/questions`),
    ]);
    const qData = await qRes.json();
    setQuestions(qData.questions ?? []);
    // refresh stats from the full set
    const all: Question[] = (await sRes.json()).questions ?? [];
    const bySection: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};
    for (const q of all) {
      bySection[q.section] = (bySection[q.section] ?? 0) + 1;
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] ?? 0) + 1;
    }
    setStats({ total: all.length, bySection, byDifficulty });
    setSelected(new Set());
    setLoading(false);
  }, [section, difficulty, source, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteIds(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} question(s)? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/questions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed.");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/dashboard/logout", { method: "POST" });
    router.replace("/dashboard/login");
    router.refresh();
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const allSelected = questions.length > 0 && selected.size === questions.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            {stats.total} question(s) stored. Content is managed via the ingest
            API / skill; use this view to inspect and delete.
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Log out
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total" value={stats.total} />
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="mb-1 text-xs font-semibold text-slate-500">By section</div>
          {SECTIONS.map((s) => (
            <div key={s.id} className="flex justify-between">
              <span className="text-slate-600">{s.short}</span>
              <span className="font-medium">{stats.bySection[s.id] ?? 0}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <div className="mb-1 text-xs font-semibold text-slate-500">By difficulty</div>
          {DIFFICULTIES.map((d) => (
            <div key={d} className="flex justify-between capitalize">
              <span className="text-slate-600">{d}</span>
              <span className="font-medium">{stats.byDifficulty[d] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select label="Section" value={section} onChange={setSection}
          options={[{ value: "", label: "All sections" }, ...SECTIONS.map((s) => ({ value: s.id, label: s.name }))]} />
        <Select label="Difficulty" value={difficulty} onChange={setDifficulty}
          options={[{ value: "", label: "All difficulties" }, ...DIFFICULTIES.map((d) => ({ value: d, label: d }))]} />
        <Select label="Source" value={source} onChange={setSource}
          options={[{ value: "", label: "All sources" }, { value: "seed", label: "Curated" }, { value: "ai", label: "AI / added" }]} />
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Search</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search text…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) =>
              setSelected(e.target.checked ? new Set(questions.map((q) => q.id)) : new Set())
            }
            className="h-4 w-4 accent-brand-600"
          />
          Select all ({questions.length})
        </label>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">{loading ? "Loading…" : `${questions.length} shown`}</span>
          <button
            onClick={() => deleteIds([...selected])}
            disabled={busy || selected.size === 0}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-40"
          >
            Delete selected ({selected.size})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {!loading && questions.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            No questions match these filters.
          </div>
        )}
        {questions.map((q) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(q.id)}
                onChange={() => toggle(q.id)}
                className="mt-1 h-4 w-4 accent-brand-600"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <SectionBadge section={q.section} />
                  <DifficultyBadge difficulty={q.difficulty} />
                  <span className="text-xs text-slate-500">{q.topic}</span>
                  <span className="text-xs text-slate-300">{q.id}</span>
                </div>
                <p className="font-medium text-slate-900">{q.question}</p>
                <ul className="mt-1 text-sm text-slate-600">
                  {q.options.map((o, i) => (
                    <li key={i} className={i === q.correctIndex ? "font-semibold text-green-700" : ""}>
                      {LETTERS[i]}. {o}{i === q.correctIndex ? "  ✓" : ""}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => deleteIds([q.id])}
                disabled={busy}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
