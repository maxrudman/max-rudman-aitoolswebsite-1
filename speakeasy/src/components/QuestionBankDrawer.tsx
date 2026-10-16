"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { QUESTION_BANK, QUESTION_COUNT } from "@/data/questionBank";

/** Slide-over panel listing the hard-coded question bank, grouped by category, with search. */
export function QuestionBankDrawer({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (q: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const titleId = useId();
  const searchId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return QUESTION_BANK.map((g) => ({
      ...g,
      questions: q ? g.questions.filter((x) => x.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)) : g.questions,
    })).filter((g) => g.questions.length);
  }, [query]);
  const shown = groups.reduce((n, g) => n + g.questions.length, 0);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-md border-l border-line bg-surface p-0 text-ink shadow-2xl sm:rounded-l-3xl"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-line p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold">
              Common questions
            </h2>
            <button type="button" onClick={onClose} aria-label="Close question bank" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-accent-soft hover:text-ink">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <label htmlFor={searchId} className="sr-only">
            Search questions
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${QUESTION_COUNT} questions`}
            autoFocus
            className="mt-4 w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-[15px] focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-accent-ring/30"
          />
          <p className="mt-2 text-xs text-muted" aria-live="polite">
            {shown} {shown === 1 ? "question" : "questions"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {groups.length === 0 && <p className="text-muted">No questions match &ldquo;{query}&rdquo;.</p>}
          {groups.map((g) => (
            <section key={g.category} className="mb-6" aria-label={g.category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{g.category}</h3>
              <ul className="space-y-1">
                {g.questions.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => onPick(q)}
                      className="w-full rounded-xl px-3 py-2 text-left text-[15px] transition-colors hover:bg-accent-soft hover:text-accent"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </dialog>
  );
}
