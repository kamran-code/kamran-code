"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { DifficultyBadge, SectionBadge } from "./SectionBadge";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function QuizRunner({
  questions,
  onRestart,
}: {
  questions: Question[];
  onRestart: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => questions.map(() => null),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [finished, setFinished] = useState(false);

  const q = questions[current];
  const isLast = current === questions.length - 1;

  function check() {
    if (selected === null) return;
    const next = [...answers];
    next[current] = selected;
    setAnswers(next);
    setChecked(true);
  }

  function advance() {
    if (isLast) {
      setFinished(true);
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
    setChecked(false);
  }

  if (finished) {
    const score = answers.reduce<number>(
      (acc, ans, i) => acc + (ans === questions[i].correctIndex ? 1 : 0),
      0,
    );
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl font-bold text-brand-600">{pct}%</div>
          <p className="mt-2 text-lg text-slate-700">
            You scored {score} out of {questions.length}.
          </p>
          <button
            onClick={onRestart}
            className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700"
          >
            New quiz
          </button>
        </div>

        <h2 className="text-xl font-bold text-slate-900">Review</h2>
        <div className="space-y-4">
          {questions.map((rq, i) => {
            const ans = answers[i];
            const correct = ans === rq.correctIndex;
            return (
              <div
                key={rq.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${correct ? "text-green-600" : "text-red-600"}`}
                  >
                    {correct ? "✓ Correct" : "✗ Incorrect"}
                  </span>
                  <span className="text-xs text-slate-400">
                    Question {i + 1}
                  </span>
                </div>
                <p className="mb-2 font-medium text-slate-900">{rq.question}</p>
                <p className="text-sm text-slate-600">
                  Correct answer:{" "}
                  <span className="font-semibold">
                    {LETTERS[rq.correctIndex]}. {rq.options[rq.correctIndex]}
                  </span>
                </p>
                {ans !== null && !correct && (
                  <p className="text-sm text-red-600">
                    Your answer: {LETTERS[ans]}. {rq.options[ans]}
                  </p>
                )}
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                  {rq.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">
          Question {current + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-2">
          <SectionBadge section={q.section} />
          <DifficultyBadge difficulty={q.difficulty} />
        </div>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-brand-600 transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-4 whitespace-pre-wrap text-lg font-medium text-slate-900">
          {q.question}
        </p>
        <ul className="space-y-2">
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === q.correctIndex;
            let cls =
              "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50";
            if (checked) {
              if (isCorrect) cls = "border-green-400 bg-green-50";
              else if (isSelected) cls = "border-red-400 bg-red-50";
              else cls = "border-slate-200 bg-white opacity-70";
            } else if (isSelected) {
              cls = "border-brand-500 bg-brand-50";
            }
            return (
              <li key={i}>
                <button
                  disabled={checked}
                  onClick={() => setSelected(i)}
                  className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition ${cls}`}
                >
                  <span className="font-semibold text-slate-500">
                    {LETTERS[i]}.
                  </span>
                  <span className="whitespace-pre-wrap text-slate-800">
                    {opt}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {checked && (
          <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            <span className="font-semibold">Explanation: </span>
            {q.explanation}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          {!checked ? (
            <button
              onClick={check}
              disabled={selected === null}
              className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Check answer
            </button>
          ) : (
            <button
              onClick={advance}
              className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700"
            >
              {isLast ? "Finish quiz" : "Next question →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
