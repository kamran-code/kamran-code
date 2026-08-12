"use client";

import { useState } from "react";
import { QuestionForm } from "./QuestionForm";

/** Collapsible "Add question" panel wrapping the shared QuestionForm. */
export function AddQuestionForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
      >
        + Add question
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Add a question</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Close
        </button>
      </div>
      <QuestionForm
        mode="add"
        onDone={() => {
          onAdded();
        }}
      />
    </div>
  );
}
