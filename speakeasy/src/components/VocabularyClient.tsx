"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { LEVELS, PreferencesForm, type Prefs, type Stats } from "./PreferencesForm";
import { Button, Card, cx, ErrorNotice, Field, PageHeader, Skeleton, Spinner } from "./ui";

type CardData = { id: string; word: string; definition: string; example: string; box: number; isNew: boolean; isReview: boolean };
type State = { onboarded: false } | { onboarded: true; preferences: Prefs | null; stats: Stats; card: CardData | null; needsRefill: boolean };
type NextResponse = { card: CardData | null; stats: Stats; needsRefill: boolean };

export function VocabularyClient() {
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState("");
  const [refilling, setRefilling] = useState(false);
  const [refillError, setRefillError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setState(await api<State>("/api/vocab/next"));
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Generate replacement terms in the background so studying never has to wait. */
  const refill = useCallback(async (force = false) => {
    setRefilling(true);
    setRefillError("");
    try {
      const res = await api<{ added: number; stats: Stats }>(`/api/vocab/refill${force ? "?force=1" : ""}`, { method: "POST" });
      setState((s) => (s && s.onboarded ? { ...s, stats: res.stats, needsRefill: false } : s));
      return res;
    } catch (err) {
      setRefillError(errorMessage(err));
      return null;
    } finally {
      setRefilling(false);
    }
  }, []);

  const applyNext = useCallback(
    (res: NextResponse) => {
      setState((s) => (s && s.onboarded ? { ...s, card: res.card, stats: res.stats, needsRefill: res.needsRefill } : s));
      if (res.needsRefill && !refilling) {
        refill().then((r) => {
          // If the set had run completely dry, fetch a card now that new terms exist.
          if (r?.added && !res.card) load();
        });
      }
    },
    [refill, refilling, load],
  );

  if (loadError) return <ErrorNotice message={loadError} onRetry={load} />;
  if (!state) return <VocabSkeleton />;
  if (!state.onboarded) return <Onboarding onDone={load} />;

  return (
    <div>
      <PageHeader
        title="Vocabulary"
        subtitle={state.preferences ? `${state.preferences.level} · ${state.preferences.field} · for ${state.preferences.audience}` : undefined}
        action={
          <PreferencesPopover
            preferences={state.preferences}
            onSaved={(r) => {
              setState((s) => (s && s.onboarded ? { ...s, preferences: r.preferences, stats: r.stats } : s));
              if (!state.card) load();
            }}
          />
        }
      />

      {state.card ? (
        <Flashcard key={state.card.id} card={state.card} onNext={applyNext} />
      ) : refilling ? (
        <GeneratingCard label="Adding new terms to your set…" />
      ) : (
        <Card className="mx-auto max-w-xl p-8 text-center">
          <h2 className="text-lg font-semibold">No terms to study right now</h2>
          <p className="mt-2 text-muted">Generate a fresh set based on your preferences.</p>
          {refillError && (
            <div className="mt-4 text-left">
              <ErrorNotice message={refillError} />
            </div>
          )}
          <Button className="mt-6" onClick={() => refill(true).then((r) => r && load())}>
            Generate terms
          </Button>
        </Card>
      )}

      <StatLine stats={state.stats} refilling={refilling && !!state.card} refillError={state.card ? refillError : ""} onRetryRefill={() => refill()} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function Flashcard({ card, onNext }: { card: CardData; onNext: (res: NextResponse) => void }) {
  const [revealed, setRevealed] = useState(false);
  const [kept, setKept] = useState(false);
  const [busy, setBusy] = useState<"right" | "wrong" | "remove" | null>(null);
  const [error, setError] = useState("");
  const revealRef = useRef<HTMLButtonElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);

  const grade = useCallback(
    async (correct: boolean) => {
      if (!revealed || busy) return;
      setBusy(correct ? "right" : "wrong");
      setError("");
      try {
        // Grading a new term without choosing Keep/Remove counts as Keep.
        onNext(await api<NextResponse>("/api/vocab/grade", { body: { termId: card.id, correct } }));
      } catch (err) {
        setError(errorMessage(err));
        setBusy(null);
      }
    },
    [revealed, busy, card.id, onNext],
  );

  async function remove() {
    if (busy) return;
    setBusy("remove");
    setError("");
    try {
      onNext(await api<NextResponse>("/api/vocab/remove", { body: { termId: card.id } }));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  const reveal = () => {
    setRevealed(true);
    // Move focus into the revealed content so screen readers announce it.
    requestAnimationFrame(() => answerRef.current?.focus());
  };

  // Keyboard: space reveals, ← marks wrong, → marks right.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable], dialog, [data-popover]")) return;
      if (e.key === " " && !revealed) {
        if (target.closest("button") && target !== revealRef.current) return; // let focused buttons handle space
        e.preventDefault();
        reveal();
      } else if (e.key === "ArrowLeft" && revealed) {
        e.preventDefault();
        grade(false);
      } else if (e.key === "ArrowRight" && revealed) {
        e.preventDefault();
        grade(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, grade]);

  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <Card className="relative overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 text-xs font-medium text-muted">
          <span>
            {card.isReview ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">Review · mastered</span>
            ) : card.isNew ? (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">New term</span>
            ) : (
              "Keep going"
            )}
          </span>
          <MasteryDots box={card.box} />
        </div>

        {!revealed ? (
          <button
            ref={revealRef}
            type="button"
            onClick={reveal}
            aria-expanded="false"
            className="block w-full px-6 pb-10 pt-12 text-center transition-colors hover:bg-canvas/60 focus-visible:outline-offset-[-3px]"
          >
            <span className="block text-3xl font-semibold tracking-tight sm:text-4xl">{card.word}</span>
            <span className="mt-6 inline-flex items-center gap-2 text-sm text-muted">
              Tap to reveal <Kbd>Space</Kbd>
            </span>
          </button>
        ) : (
          <div ref={answerRef} tabIndex={-1} aria-live="polite" className="px-6 pb-6 pt-8 outline-none">
            <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">{card.word}</h2>
            <div className="mt-8 space-y-4 animate-fade-up">
              <p className="text-lg leading-relaxed">{card.definition}</p>
              <p className="border-l-2 border-accent/40 pl-4 italic leading-relaxed text-muted">&ldquo;{card.example}&rdquo;</p>
            </div>

            {card.isNew && kept && (
              <p role="status" className="mt-6 text-center text-sm text-accent">
                Kept. Now grade yourself below.
              </p>
            )}
            {card.isNew && !kept && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-canvas px-4 py-3 text-sm text-muted">
                <span>This is a new term, would you like to keep it?</span>
                <span className="flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setKept(true)} disabled={!!busy}>
                    Keep
                  </Button>
                  <Button size="sm" variant="ghost" onClick={remove} loading={busy === "remove"} disabled={!!busy}>
                    Remove
                  </Button>
                </span>
              </div>
            )}
          </div>
        )}
      </Card>

      {error && (
        <div className="mt-4">
          <ErrorNotice message={error} />
        </div>
      )}

      {/* X on the left, check on the right */}
      <div className="mt-6 flex items-center justify-between gap-4" role="group" aria-label="Grade this card">
        <GradeButton kind="wrong" onClick={() => grade(false)} disabled={!revealed || !!busy} loading={busy === "wrong"} />
        <p className="hidden text-center text-xs text-muted sm:block" aria-hidden="true">
          {revealed ? (
            <>
              <Kbd>←</Kbd> wrong · right <Kbd>→</Kbd>
            </>
          ) : (
            "Reveal the card to grade it"
          )}
        </p>
        <GradeButton kind="right" onClick={() => grade(true)} disabled={!revealed || !!busy} loading={busy === "right"} />
      </div>
    </div>
  );
}

function GradeButton({ kind, onClick, disabled, loading }: { kind: "right" | "wrong"; onClick: () => void; disabled: boolean; loading: boolean }) {
  const right = kind === "right";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={right ? "I got it right" : "I got it wrong"}
      className={cx(
        "flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-150 sm:h-[72px] sm:w-[72px]",
        "disabled:cursor-not-allowed disabled:opacity-35",
        right
          ? "border-accent/30 bg-accent-soft text-accent enabled:hover:scale-105 enabled:hover:bg-accent enabled:hover:text-white"
          : "border-line bg-surface text-muted enabled:hover:scale-105 enabled:hover:border-danger/40 enabled:hover:text-danger",
      )}
    >
      {loading ? (
        <Spinner />
      ) : (
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {right ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <path d="M6 6l12 12M18 6 6 18" />}
        </svg>
      )}
    </button>
  );
}

function MasteryDots({ box }: { box: number }) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`Mastery ${box} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cx("h-1.5 w-4 rounded-full", i <= box ? "bg-accent" : "bg-line")} />
      ))}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-md border border-line bg-surface px-1.5 py-0.5 font-sans text-[11px] text-muted">{children}</kbd>;
}

function StatLine({ stats, refilling, refillError, onRetryRefill }: { stats: Stats; refilling: boolean; refillError: string; onRetryRefill: () => void }) {
  return (
    <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted" aria-live="polite">
      <span>
        <strong className="font-semibold text-ink">{stats.active}</strong> active
      </span>
      <span aria-hidden="true">·</span>
      <span>
        <strong className="font-semibold text-ink">{stats.retired}</strong> mastered
      </span>
      <span aria-hidden="true">·</span>
      <span>
        Streak <strong className="font-semibold text-ink">{stats.streak}</strong>
      </span>
      {refilling && <Spinner className="h-3.5 w-3.5" label="Adding new terms…" />}
      {refillError && !refilling && (
        <span className="text-danger">
          Couldn&apos;t add new terms.{" "}
          <button type="button" onClick={onRetryRefill} className="font-medium underline underline-offset-2">
            Retry
          </button>
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function PreferencesPopover({ preferences, onSaved }: { preferences: Prefs | null; onSaved: (r: { preferences: Prefs; added: number; stats: Stats }) => void }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Vocabulary preferences"
        title="Preferences"
        className={cx("grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-ink", open && "border-accent-ring text-accent")}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      </button>
      {open && (
        <div
          id={panelId}
          data-popover
          role="dialog"
          aria-label="Vocabulary preferences"
          className="absolute right-0 top-12 z-20 w-[min(88vw,20rem)] animate-fade-up rounded-3xl border border-line bg-surface p-5 shadow-xl"
        >
          <h2 className="mb-1 font-semibold">Preferences</h2>
          <p className="mb-4 text-sm text-muted">Saving adds new terms that match. Your current terms stay.</p>
          <PreferencesForm
            initial={preferences}
            autoFocus
            onSaved={(r) => {
              onSaved(r);
              setTimeout(() => setOpen(false), 900);
            }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<Prefs["level"] | "">("");
  const [field, setField] = useState("");
  const [audience, setAudience] = useState("");
  const [error, setError] = useState("");
  const [stepError, setStepError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const steps = ["Your level", "Your field", "Your audience"];

  async function finish() {
    setGenerating(true);
    setError("");
    try {
      if (!saved) {
        await api("/api/preferences", { method: "PUT", body: { level, field, audience } });
      } else {
        // Preferences were saved but generation failed earlier; just retry generation.
        await api("/api/vocab/refill?force=1", { method: "POST" });
      }
      onDone();
    } catch (err) {
      // Preferences are saved before generation runs, so after a generation failure a retry only regenerates.
      if (err instanceof ApiError && err.status !== 400 && err.status !== 415) setSaved(true);
      setError(errorMessage(err));
      setGenerating(false);
    }
  }

  function next() {
    setStepError("");
    if (step === 0 && !level) return setStepError("Choose the level that fits you best.");
    if (step === 1 && !field.trim()) return setStepError("Tell us your field, even roughly.");
    if (step === 2) {
      if (!audience.trim()) return setStepError("Who will you be speaking with?");
      return finish();
    }
    setStep(step + 1);
  }

  if (generating) return <GeneratingCard label="Building your starting word list…" />;

  return (
    <div className="mx-auto max-w-xl animate-fade-up">
      <PageHeader title="Let's set up your vocabulary" subtitle="Three quick questions so your terms fit how you actually speak." />
      <div className="mb-6">
        <div className="mb-2 flex justify-between text-xs font-medium text-muted">
          <span>
            Step {step + 1} of {steps.length}
          </span>
          <span>{steps[step]}</span>
        </div>
        <div role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1} className="h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <Card className="p-6 sm:p-8">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            next();
          }}
        >
          {step === 0 && (
            <fieldset>
              <legend className="mb-4 text-lg font-semibold">How would you describe your vocabulary?</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {LEVELS.map((l) => (
                  <label
                    key={l}
                    className={cx(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-accent-ring/40",
                      level === l ? "border-accent bg-accent-soft" : "border-line hover:border-accent-ring",
                    )}
                  >
                    <input type="radio" name="level" value={l} checked={level === l} onChange={() => setLevel(l)} className="accent-[var(--color-accent)]" />
                    <span className="font-medium">{l}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {step === 1 && (
            <Field label="What field are you in, or heading into?" placeholder="e.g., corporate law, nursing, software engineering" value={field} onChange={(e) => setField(e.target.value)} maxLength={100} autoFocus />
          )}
          {step === 2 && (
            <Field label="Who is your audience?" placeholder="e.g., hiring managers, clients, academic peers" value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={100} autoFocus />
          )}

          {stepError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {stepError}
            </p>
          )}
          {error && (
            <div className="mt-4">
              <ErrorNotice message={error} onRetry={finish} />
            </div>
          )}

          <div className="mt-8 flex justify-between gap-3">
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={step === 0}>
              Back
            </Button>
            <Button type="submit">{step === 2 ? "Build my word list" : "Next"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function GeneratingCard({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-xl">
      <Card className="p-8">
        <div className="mb-8 flex justify-center">
          <Spinner label={label} />
        </div>
        <Skeleton className="mx-auto h-9 w-48" />
        <Skeleton className="mt-8 h-4 w-full" />
        <Skeleton className="mt-3 h-4 w-5/6" />
        <Skeleton className="mt-6 h-4 w-2/3" />
      </Card>
    </div>
  );
}

function VocabSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading vocabulary">
      <Skeleton className="mb-3 h-8 w-40" />
      <Skeleton className="mb-10 h-4 w-64" />
      <div className="mx-auto max-w-xl">
        <Skeleton className="h-64 w-full rounded-[var(--radius-card)]" />
        <div className="mt-6 flex justify-between">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}
