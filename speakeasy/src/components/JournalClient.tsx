"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { ConfirmDialog } from "./Dialog";
import { QuestionBankDrawer } from "./QuestionBankDrawer";
import { Button, Card, ErrorNotice, Field, PageHeader, Skeleton } from "./ui";

type Entry = { id: string; prompt: string; response: string; createdAt: string; updatedAt: string };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export function JournalClient() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<Entry | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const responseRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (q: string) => {
    setLoadError("");
    try {
      const res = await api<{ entries: Entry[] }>(`/api/journal${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      setEntries(res.entries);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  // Debounced search across the user's entries.
  useEffect(() => {
    const t = setTimeout(() => load(query.trim()), query ? 250 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  async function create() {
    setFormError("");
    setFieldErrors({});
    if (!prompt.trim()) return setFieldErrors({ prompt: "Add a prompt or question." });
    setSaving(true);
    try {
      const res = await api<{ entry: Entry }>("/api/journal", { body: { prompt, response } });
      setEntries((list) => [res.entry, ...(list ?? [])]);
      setPrompt("");
      setResponse("");
      setFormOpen(false);
    } catch (err) {
      setFormError(errorMessage(err));
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const entry = toDelete;
    setToDelete(null);
    setDeleteError("");
    try {
      await api(`/api/journal/${entry.id}`, { method: "DELETE" });
      setEntries((list) => list?.filter((e) => e.id !== entry.id) ?? null);
    } catch (err) {
      setDeleteError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Answer Journal"
        subtitle="Draft, refine, and keep your best answers."
        action={
          <Button variant="secondary" onClick={() => setDrawerOpen(true)} className="shrink-0">
            <span className="hidden sm:inline">Browse common questions</span>
            <span className="sm:hidden">Questions</span>
          </Button>
        }
      />

      {/* ---------- New entry ---------- */}
      {formOpen ? (
        <Card className="mb-8 animate-fade-up p-5 sm:p-6">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
            className="space-y-4"
            aria-label="New journal entry"
          >
            <h2 className="text-lg font-semibold">New entry</h2>
            <Field label="Prompt / Question" textarea className="min-h-16" value={prompt} onChange={(e) => setPrompt(e.target.value)} error={fieldErrors.prompt} maxLength={1000} autoFocus={!prompt} />
            <div ref={responseRef}>
              <Field label="Response" textarea className="min-h-40" value={response} onChange={(e) => setResponse(e.target.value)} error={fieldErrors.response} autoFocus={!!prompt} />
            </div>
            {formError && !Object.keys(fieldErrors).length && <ErrorNotice message={formError} onRetry={create} retrying={saving} />}
            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setDrawerOpen(true)}>
                Pick a common question
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Save entry
                </Button>
              </div>
            </div>
          </form>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="mb-8 flex w-full items-center gap-3 rounded-2xl border border-dashed border-accent-ring/70 bg-surface px-5 py-4 text-left text-muted transition-colors hover:border-accent hover:text-ink"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New entry
        </button>
      )}

      {/* ---------- Search + list ---------- */}
      <div className="mb-4">
        <label htmlFor="journal-search" className="sr-only">
          Search your entries
        </label>
        <input
          id="journal-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your entries"
          className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-[15px] focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-accent-ring/30"
        />
      </div>

      {deleteError && (
        <div className="mb-4">
          <ErrorNotice message={deleteError} />
        </div>
      )}
      {loadError ? (
        <ErrorNotice message={loadError} onRetry={() => load(query.trim())} />
      ) : !entries ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading entries">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center text-muted">
          {query ? (
            <>No entries match &ldquo;{query}&rdquo;.</>
          ) : (
            <>
              <p className="font-medium text-ink">Your journal is empty</p>
              <p className="mt-1">Save an answer from Practice, or start a new entry above.</p>
            </>
          )}
        </Card>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <EntryCard
                entry={entry}
                onUpdated={(updated) => setEntries((list) => list?.map((e) => (e.id === updated.id ? updated : e)) ?? null)}
                onDelete={() => setToDelete(entry)}
              />
            </li>
          ))}
        </ul>
      )}

      <QuestionBankDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onPick={(q) => {
          setPrompt(q);
          setFormOpen(true);
          setDrawerOpen(false);
          setFieldErrors({});
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete this entry?"
        message="This permanently deletes the entry. This can't be undone."
        confirmLabel="Delete"
        danger
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function EntryCard({ entry, onUpdated, onDelete }: { entry: Entry; onUpdated: (e: Entry) => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [prompt, setPrompt] = useState(entry.prompt);
  const [response, setResponse] = useState(entry.response);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const bodyId = `entry-${entry.id}`;

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await api<{ entry: Entry }>(`/api/journal/${entry.id}`, { method: "PATCH", body: { prompt, response } });
      onUpdated(res.entry);
      setEditing(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Card className="p-5 sm:p-6">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-4"
          aria-label="Edit entry"
        >
          <Field label="Prompt / Question" textarea className="min-h-16" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={1000} autoFocus />
          <Field label="Response" textarea className="min-h-40" value={response} onChange={(e) => setResponse(e.target.value)} />
          {error && <ErrorNotice message={error} onRetry={save} retrying={saving} />}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPrompt(entry.prompt);
                setResponse(entry.response);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card className="transition-shadow hover:shadow-sm">
      <button type="button" onClick={() => setExpanded((x) => !x)} aria-expanded={expanded} aria-controls={bodyId} className="block w-full rounded-[var(--radius-card)] p-5 text-left sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-semibold leading-snug">{entry.prompt}</h3>
          <time dateTime={entry.createdAt} className="shrink-0 text-xs text-muted">
            {formatDate(entry.createdAt)}
          </time>
        </div>
        {!expanded && <p className="mt-2 line-clamp-2 text-muted">{entry.response || <em>No response yet</em>}</p>}
      </button>
      {expanded && (
        <div id={bodyId} className="animate-fade-up px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="whitespace-pre-wrap leading-relaxed">{entry.response || <em className="text-muted">No response yet</em>}</p>
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="hover:text-danger">
              Delete
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
