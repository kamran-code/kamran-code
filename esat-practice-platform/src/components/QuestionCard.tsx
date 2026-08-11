"use client";

import { useState } from "react";
import type { GeneratedQuestion, Question } from "@/lib/types";
import { DifficultyBadge, SectionBadge } from "./SectionBadge";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

type CardQuestion = Question | (GeneratedQuestion & { section?: string });

/**
 * Displays a single question with reveal-able answer. Used in the practice
 * bank and to preview generated questions.
 */
export function QuestionCard({ question }: { question: CardQuestion }) {
  const [revealed, setRevealed] = useState(false);
  const section = "section" in question ? question.section : undefined;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {section && <SectionBadge section={section} />}
        <DifficultyBadge difficulty={question.difficulty} />
        <span className="text-xs text-slate-500">{question.topic}</span>
      </div>

      <p className="mb-4 whitespace-pre-wrap font-medium text-slate-900">
        {question.question}
      </p>

      <ul className="space-y-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correctIndex;
          return (
            <li
              key={i}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
                revealed && isCorrect
                  ? "border-green-300 bg-green-50 text-green-900"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <span className="font-semibold text-slate-500">{LETTERS[i]}.</span>
              <span className="whitespace-pre-wrap">{opt}</span>
              {revealed && isCorrect && (
                <span className="ml-auto text-xs font-semibold text-green-700">
                  ✓ correct
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4">
        <button
          onClick={() => setRevealed((v) => !v)}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          {revealed ? "Hide answer & explanation" : "Show answer & explanation"}
        </button>
        {revealed && (
          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {question.explanation}
          </p>
        )}
      </div>
    </article>
  );
}
