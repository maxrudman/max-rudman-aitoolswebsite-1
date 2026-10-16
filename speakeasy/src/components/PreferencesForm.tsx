"use client";

import { useId, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { Button, ErrorNotice, Field } from "./ui";

export const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"] as const;
export type Prefs = { level: (typeof LEVELS)[number]; field: string; audience: string };
export type Stats = { active: number; retired: number; streak: number; bestStreak: number };

/** Edit level / field / audience. Saving generates new terms that match (existing terms are kept). */
export function PreferencesForm({
  initial,
  onSaved,
  submitLabel = "Save and add terms",
  autoFocus,
}: {
  initial: Prefs | null;
  onSaved?: (result: { preferences: Prefs; added: number; stats: Stats }) => void;
  submitLabel?: string;
  autoFocus?: boolean;
}) {
  const [level, setLevel] = useState<Prefs["level"]>(initial?.level ?? "Intermediate");
  const [field, setField] = useState(initial?.field ?? "");
  const [audience, setAudience] = useState(initial?.audience ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const levelId = useId();

  async function save() {
    setError("");
    setNotice("");
    setFieldErrors({});
    setSaving(true);
    try {
      const result = await api<{ preferences: Prefs; added: number; stats: Stats }>("/api/preferences", {
        method: "PUT",
        body: { level, field, audience },
      });
      setNotice(result.added ? `Saved. Added ${result.added} new terms to your set.` : "Saved.");
      onSaved?.(result);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <label htmlFor={levelId} className="block text-sm font-medium">
          Vocabulary level
        </label>
        <select
          id={levelId}
          value={level}
          onChange={(e) => setLevel(e.target.value as Prefs["level"])}
          autoFocus={autoFocus}
          className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-[15px] focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-accent-ring/30"
        >
          {LEVELS.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
      </div>
      <Field label="Field" placeholder="e.g., corporate law" value={field} onChange={(e) => setField(e.target.value)} error={fieldErrors.field} maxLength={100} />
      <Field label="Audience" placeholder="e.g., hiring managers" value={audience} onChange={(e) => setAudience(e.target.value)} error={fieldErrors.audience} maxLength={100} />
      {error && <ErrorNotice message={error} onRetry={save} retrying={saving} />}
      {notice && (
        <p role="status" className="text-sm text-accent">
          {notice}
        </p>
      )}
      <Button type="submit" loading={saving} className="w-full">
        {saving ? "Generating new terms…" : submitLabel}
      </Button>
    </form>
  );
}
