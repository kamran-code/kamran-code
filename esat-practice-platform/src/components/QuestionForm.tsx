"use client";

import { useState } from "react";
import { SECTIONS, DIFFICULTIES } from "@/lib/esat";
import type { Question } from "@/lib/types";
import { QuestionFigure } from "./QuestionFigure";

const MAX_IMAGE_LEN = 500_000;

type FormState = {
  section: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  image: string;
  imageAlt: string;
};

function stateFrom(initial?: Question): FormState {
  if (initial) {
    return {
      section: initial.section,
      topic: initial.topic,
      difficulty: initial.difficulty,
      question: initial.question,
      options: initial.options.length ? [...initial.options] : ["", ""],
      correctIndex: initial.correctIndex,
      explanation: initial.explanation,
      image: initial.image ?? "",
      imageAlt: initial.imageAlt ?? "",
    };
  }
  return {
    section: SECTIONS[0].id,
    topic: "",
    difficulty: "medium",
    question: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
    image: "",
    imageAlt: "",
  };
}

/**
 * Shared add/edit form for a single question. In "add" mode it POSTs to the
 * import endpoint; in "edit" mode it PATCHes via the update endpoint (by id).
 * Both use the admin session cookie.
 */
export function QuestionForm({
  mode,
  initial,
  onDone,
  onCancel,
}: {
  mode: "add" | "edit";
  initial?: Question;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [f, setF] = useState<FormState>(() => stateFrom(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  function setOption(i: number, value: string) {
    setF((prev) => {
      const options = [...prev.options];
      options[i] = value;
      return { ...prev, options };
    });
  }

  function addOption() {
    setF((prev) =>
      prev.options.length >= 8 ? prev : { ...prev, options: [...prev.options, ""] },
    );
  }

  function removeOption(i: number) {
    setF((prev) => {
      if (prev.options.length <= 2) return prev;
      const options = prev.options.filter((_, idx) => idx !== i);
      let correctIndex = prev.correctIndex;
      if (i === correctIndex) correctIndex = 0;
      else if (i < correctIndex) correctIndex -= 1;
      return { ...prev, options, correctIndex };
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = String(reader.result || "");
      if (dataUri.length > MAX_IMAGE_LEN) {
        setError(
          `Image is too large (${Math.round(dataUri.length / 1024)} KB). Max ~500 KB — use a smaller file or an SVG.`,
        );
        return;
      }
      set("image", dataUri);
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const options = f.options.map((o) => o.trim()).filter(Boolean);
    if (!f.question.trim()) return setError("Question text is required.");
    if (options.length < 2) return setError("At least 2 non-empty options are required.");
    if (f.correctIndex >= options.length) return setError("Pick a valid correct answer.");
    if (!f.explanation.trim()) return setError("Explanation is required.");
    if (f.image && f.image.length > MAX_IMAGE_LEN) return setError("Figure is too large (max ~500 KB).");

    const base = {
      section: f.section,
      topic: f.topic.trim() || "General",
      difficulty: f.difficulty,
      question: f.question.trim(),
      options,
      correctIndex: f.correctIndex,
      explanation: f.explanation.trim(),
    };

    setBusy(true);
    try {
      let res: Response;
      if (mode === "edit" && initial) {
        // Send image/imageAlt always so clearing works (empty string clears).
        const update = {
          id: initial.id,
          ...base,
          image: f.image.trim(),
          imageAlt: f.image.trim() ? f.imageAlt.trim() : "",
        };
        res = await fetch("/api/questions/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates: [update] }),
        });
        const data = await res.json();
        if (!res.ok || !data.updated) {
          throw new Error(data.missing?.[0] || data.error || "Could not save changes.");
        }
      } else {
        const question = {
          ...base,
          ...(f.image.trim() ? { image: f.image.trim() } : {}),
          ...(f.image.trim() && f.imageAlt.trim() ? { imageAlt: f.imageAlt.trim() } : {}),
        };
        res = await fetch("/api/questions/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: [question] }),
        });
        const data = await res.json();
        if (!res.ok || !data.saved) {
          throw new Error(data.errors?.[0] || data.error || "Could not add the question.");
        }
        setF(stateFrom());
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Section</span>
          <select className={inputCls} value={f.section} onChange={(e) => set("section", e.target.value)}>
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Topic</span>
          <input className={inputCls} list={`topic-list-${initial?.id ?? "new"}`} value={f.topic}
            onChange={(e) => set("topic", e.target.value)} placeholder="General" />
          <datalist id={`topic-list-${initial?.id ?? "new"}`}>
            {SECTIONS.find((s) => s.id === f.section)?.topics.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Difficulty</span>
          <select className={inputCls} value={f.difficulty} onChange={(e) => set("difficulty", e.target.value)}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d} className="capitalize">{d}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-600">Question</span>
        <textarea className={inputCls} rows={3} value={f.question}
          onChange={(e) => set("question", e.target.value)}
          placeholder="Plain-text maths: ^ powers, * multiply, sqrt(), pi" />
      </label>

      <div className="text-sm">
        <span className="mb-1 block font-medium text-slate-600">
          Options (select the correct one)
        </span>
        <div className="space-y-2">
          {f.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name={`correct-${initial?.id ?? "new"}`} checked={f.correctIndex === i}
                onChange={() => set("correctIndex", i)} className="h-4 w-4 accent-brand-600" />
              <input className={inputCls} value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + i)}`} />
              <button type="button" onClick={() => removeOption(i)}
                disabled={f.options.length <= 2}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40">
                Remove
              </button>
            </div>
          ))}
        </div>
        {f.options.length < 8 && (
          <button type="button" onClick={addOption}
            className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700">
            + Add option
          </button>
        )}
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-slate-600">Explanation</span>
        <textarea className={inputCls} rows={2} value={f.explanation}
          onChange={(e) => set("explanation", e.target.value)} />
      </label>

      {/* Figure */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <span className="mb-2 block font-medium text-slate-600">Figure (optional)</span>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={onFile} className="text-xs" />
          {f.image && (
            <button type="button" onClick={() => { set("image", ""); set("imageAlt", ""); }}
              className="text-xs font-medium text-red-600 hover:underline">
              Remove figure
            </button>
          )}
        </div>
        <textarea className={`${inputCls} mt-2 font-mono text-xs`} rows={2} value={f.image}
          onChange={(e) => set("image", e.target.value)}
          placeholder="…or paste inline SVG, a data: URI, or an https image URL" />
        {f.image && (
          <>
            <input className={`${inputCls} mt-2`} value={f.imageAlt}
              onChange={(e) => set("imageAlt", e.target.value)}
              placeholder="Alt text (short description of the figure)" />
            <div className="mt-2">
              <span className="text-xs text-slate-500">Preview:</span>
              <QuestionFigure image={f.image} alt={f.imageAlt} />
            </div>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
        )}
        <button type="submit" disabled={busy}
          className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
          {busy ? "Saving…" : mode === "edit" ? "Save changes" : "Add question"}
        </button>
      </div>
    </form>
  );
}
