"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { ConfirmDialog } from "./Dialog";
import { Button, Card, cx, ErrorNotice, Field, PageHeader, Skeleton, Spinner } from "./ui";
import { formatTime, useRecorder } from "./useRecorder";

type Audience = { purpose: string; role: string; specifications: string };
type Session = { audience: Audience; questions: string[]; index: number };

const STORAGE_KEY = "speakeasy:practice";
const MOVE_ON_WARNING = "Moving on will delete your current recording. Continue?";

export function PracticeClient() {
  const [audience, setAudience] = useState<Audience>({ purpose: "", role: "", specifications: "" });
  const [questions, setQuestions] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [genError, setGenError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  const rec = useRecorder();
  const [savedToJournal, setSavedToJournal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<null | (() => void)>(null);
  const [announce, setAnnounce] = useState("");

  // Restore this tab's practice session, or the last audience saved on the server.
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const s: Session = JSON.parse(saved);
        setAudience(s.audience);
        setQuestions(s.questions);
        setIndex(s.index);
        setReady(true);
        return;
      } catch {
        /* ignore corrupt storage */
      }
    }
    api<{ audience: Audience }>("/api/questions")
      .then((r) => setAudience(r.audience))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (questions.length) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ audience, questions, index } satisfies Session));
  }, [audience, questions, index]);

  const hasUnsaved = rec.status === "recording" || (!!rec.audioUrl && !savedToJournal);

  /** Ask before discarding an unsaved take; otherwise run the action right away. */
  const guard = (action: () => void) => (hasUnsaved ? setPending(() => action) : action());

  const fetchQuestions = useCallback(
    async (exclude: string[]) => api<{ questions: string[] }>("/api/questions", { body: { ...audience, exclude } }),
    [audience],
  );

  async function generate() {
    setGenError("");
    setFieldErrors({});
    const errs: Record<string, string> = {};
    if (!audience.purpose.trim()) errs.purpose = "Describe the purpose.";
    if (!audience.role.trim()) errs.role = "Describe the role or subject.";
    if (Object.keys(errs).length) return setFieldErrors(errs);

    setGenerating(true);
    try {
      const res = await fetchQuestions([]);
      rec.reset();
      setSavedToJournal(false);
      setQuestions(res.questions);
      setIndex(0);
      setEditing(false);
    } catch (err) {
      setGenError(errorMessage(err));
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors);
    } finally {
      setGenerating(false);
    }
  }

  async function goNext() {
    setSaveError("");
    rec.reset();
    setSavedToJournal(false);
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    // Out of questions: generate another batch, then continue.
    setLoadingMore(true);
    setGenError("");
    try {
      const res = await fetchQuestions(questions);
      setQuestions((q) => [...q, ...res.questions]);
      setIndex(index + 1);
    } catch (err) {
      setGenError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleRecording() {
    if (rec.status === "recording") {
      rec.stop();
      setAnnounce("Recording stopped.");
      return;
    }
    const begin = async () => {
      setSavedToJournal(false);
      setSaveError("");
      await rec.start();
      setAnnounce("Recording started.");
    };
    rec.audioUrl && !savedToJournal ? setPending(() => begin) : begin();
  }

  async function saveToJournal() {
    setSaving(true);
    setSaveError("");
    try {
      await api("/api/journal", { body: { prompt: questions[index], response: rec.transcript } });
      setSavedToJournal(true);
    } catch (err) {
      setSaveError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(rec.transcript);
    } catch {
      // Fallback for browsers without the async clipboard API.
      const ta = document.createElement("textarea");
      ta.value = rec.transcript;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // Warn before leaving the page with an unsaved recording.
  const unsavedRef = useRef(hasUnsaved);
  unsavedRef.current = hasUnsaved;
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (unsavedRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const hasQuestions = questions.length > 0;
  const summary = [audience.purpose, audience.role, audience.specifications].filter(Boolean).join(" · ");

  return (
    <div>
      <PageHeader title="Practice" subtitle="Generate questions for your audience, then answer out loud." />

      {/* ---------- Audience ---------- */}
      {!ready ? (
        <Skeleton className="h-14 w-full rounded-2xl" />
      ) : hasQuestions && !editing ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Audience: ${summary}. Edit audience`}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-accent-ring"
        >
          <span className="min-w-0">
            <span className="block text-xs font-medium uppercase tracking-wide text-muted">Audience</span>
            <span className="block truncate">{summary}</span>
          </span>
          <span className="shrink-0 text-sm font-medium text-accent">Edit</span>
        </button>
      ) : !editing && !hasQuestions ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-expanded="false"
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-accent-ring/70 bg-surface px-5 py-4 text-left text-lg text-muted transition-colors hover:border-accent hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Who is your audience?
        </button>
      ) : (
        <Card className="animate-fade-up p-5 sm:p-6">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              guard(generate);
            }}
            className="space-y-4"
            aria-label="Who is your audience?"
          >
            <h2 className="text-lg font-semibold">Who is your audience?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Purpose" placeholder="e.g., Job interview for a college senior" value={audience.purpose} onChange={(e) => setAudience({ ...audience, purpose: e.target.value })} error={fieldErrors.purpose} maxLength={200} autoFocus />
              <Field label="Role / Subject" placeholder="e.g., Paralegal at a corporate firm" value={audience.role} onChange={(e) => setAudience({ ...audience, role: e.target.value })} error={fieldErrors.role} maxLength={200} />
            </div>
            <Field
              label="Specifications"
              placeholder="e.g., Medium difficulty; focus on how my background is relevant to the job"
              value={audience.specifications}
              onChange={(e) => setAudience({ ...audience, specifications: e.target.value })}
              error={fieldErrors.specifications}
              maxLength={500}
            />
            {genError && !loadingMore && <ErrorNotice message={genError} onRetry={() => guard(generate)} retrying={generating} />}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={generating}>
                {generating ? "Generating…" : hasQuestions ? "Regenerate questions" : "Generate questions"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ---------- Current question ---------- */}
      {generating && (
        <Card className="mt-6 p-6 sm:p-8" aria-busy="true">
          <Spinner label="Writing questions for your audience…" />
          <Skeleton className="mt-6 h-7 w-full" />
          <Skeleton className="mt-3 h-7 w-3/4" />
        </Card>
      )}

      {hasQuestions && !generating && (
        <>
          <Card className="mt-6 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-muted" aria-live="polite">
                Question {index + 1} of {questions.length}
              </p>
              <Button variant="secondary" size="sm" onClick={() => guard(goNext)} loading={loadingMore}>
                {loadingMore ? "Getting more…" : "Next"}
                {!loadingMore && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                )}
              </Button>
            </div>
            <h2 key={index} className="mt-4 animate-fade-up text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              {questions[index]}
            </h2>
            {genError && loadingMore === false && index === questions.length - 1 && !editing && (
              <div className="mt-4">
                <ErrorNotice message={genError} onRetry={goNext} />
              </div>
            )}
          </Card>

          {/* ---------- Recorder ---------- */}
          <Card className="mt-6 p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <button
                type="button"
                onClick={toggleRecording}
                aria-pressed={rec.status === "recording"}
                aria-label={rec.status === "recording" ? "Stop recording" : "Start recording"}
                className={cx(
                  "grid h-24 w-24 place-items-center rounded-full text-white shadow-lg transition-all duration-200 sm:h-28 sm:w-28",
                  rec.status === "recording" ? "scale-105 bg-danger ring-8 ring-danger/15" : "bg-accent hover:scale-105 hover:bg-accent-hover",
                )}
              >
                {rec.status === "recording" ? (
                  <span className="h-8 w-8 rounded-lg bg-white" aria-hidden="true" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
                  </svg>
                )}
              </button>

              <div className="mt-4 h-6 text-sm">
                {rec.status === "recording" ? (
                  <span className="inline-flex items-center gap-2 font-medium text-danger">
                    <span className="h-2.5 w-2.5 animate-rec rounded-full bg-danger" aria-hidden="true" />
                    Recording <span role="timer" className="tabular-nums">{formatTime(rec.elapsed)}</span>
                  </span>
                ) : rec.audioUrl ? (
                  <span className="text-muted">Recorded {formatTime(rec.elapsed)} · tap to record a new take</span>
                ) : (
                  <span className="text-muted">Tap the microphone to start answering</span>
                )}
              </div>
              <p className="sr-only" aria-live="assertive">
                {announce}
              </p>

              {rec.error && (
                <div className="mt-4 w-full text-left">
                  <ErrorNotice message={rec.error} />
                </div>
              )}
              {!rec.support.speech && (
                <p className="mt-4 rounded-xl bg-canvas px-4 py-2 text-sm text-muted">
                  Live transcription isn&apos;t supported in this browser (try Chrome, Edge, or Safari). You can still record, replay, and type your transcript.
                </p>
              )}
              {rec.speechNote && <p className="mt-4 rounded-xl bg-canvas px-4 py-2 text-sm text-muted">{rec.speechNote}</p>}
            </div>

            {rec.status === "recording" && (
              <div className="mt-6 rounded-2xl bg-canvas p-4" aria-live="polite" aria-label="Live transcript">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">Live transcript</p>
                <p className="mt-2 min-h-12 leading-relaxed">
                  {rec.transcript}
                  {rec.interim && <span className="text-muted"> {rec.interim}</span>}
                  {!rec.transcript && !rec.interim && <span className="text-muted">{rec.support.speech ? "Listening…" : "Transcript unavailable in this browser."}</span>}
                </p>
              </div>
            )}

            {rec.status === "stopped" && (
              <div className="mt-6 animate-fade-up space-y-5">
                {rec.audioUrl ? (
                  <audio controls src={rec.audioUrl} className="w-full" aria-label="Your recorded answer" />
                ) : (
                  <Spinner label="Preparing your recording…" />
                )}
                <Field
                  label="Transcript"
                  textarea
                  value={rec.transcript}
                  onChange={(e) => rec.setTranscript(e.target.value)}
                  placeholder={rec.support.speech ? "No speech was detected. You can type your answer here." : "Type your answer here."}
                  hint="You can edit the transcript before copying or saving it."
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" onClick={copy} disabled={!rec.transcript.trim()}>
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button onClick={saveToJournal} loading={saving} disabled={!rec.transcript.trim() || savedToJournal}>
                    {savedToJournal ? "Saved to Journal" : "Save to Journal"}
                  </Button>
                  <span className="sr-only" aria-live="polite">
                    {copied ? "Copied to clipboard" : savedToJournal ? "Saved to journal" : ""}
                  </span>
                </div>
                {saveError && <ErrorNotice message={saveError} onRetry={saveToJournal} retrying={saving} />}
              </div>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        open={!!pending}
        title="Delete this recording?"
        message={MOVE_ON_WARNING}
        confirmLabel="Continue"
        danger
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          rec.reset();
          setSavedToJournal(false);
          action?.();
        }}
      />
    </div>
  );
}
