"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { PreferencesForm, type Prefs } from "./PreferencesForm";
import { Button, Card, ErrorNotice, Field, PageHeader } from "./ui";

export function AccountClient({ username, preferences }: { username: string; preferences: Prefs | null }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      sessionStorage.clear();
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Account" />

      <Card className="mb-6 flex items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-lg font-semibold uppercase text-accent">
            {username.slice(0, 1)}
          </span>
          <div>
            <p className="text-sm text-muted">Signed in as</p>
            <p className="text-lg font-semibold">{username}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={logout} loading={loggingOut}>
          Log out
        </Button>
      </Card>

      <Card className="mb-6 p-6">
        <h2 className="text-lg font-semibold">Vocabulary preferences</h2>
        <p className="mb-5 mt-1 text-sm text-muted">Saving adds new terms that match. Your current terms stay in your set.</p>
        <PreferencesForm initial={preferences} />
      </Card>

      <Card className="p-6">
        <h2 className="mb-5 text-lg font-semibold">Change password</h2>
        <ChangePasswordForm />
      </Card>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  async function submit() {
    setError("");
    setFieldErrors({});
    setDone(false);
    if (newPassword.length < 8) return setFieldErrors({ newPassword: "Password must be at least 8 characters." });
    if (newPassword !== confirmPassword) return setFieldErrors({ confirmPassword: "Passwords don't match." });
    setSaving(true);
    try {
      await api("/api/auth/password", { body: { currentPassword, newPassword, confirmPassword } });
      setDone(true);
      setCurrent("");
      setNew("");
      setConfirm("");
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
        submit();
      }}
      className="space-y-4"
    >
      <Field label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} error={fieldErrors.currentPassword} />
      <Field label="New password" type="password" autoComplete="new-password" hint="At least 8 characters." value={newPassword} onChange={(e) => setNew(e.target.value)} error={fieldErrors.newPassword} />
      <Field label="Confirm new password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} error={fieldErrors.confirmPassword} />
      {error && !Object.keys(fieldErrors).length && <ErrorNotice message={error} />}
      {done && (
        <p role="status" className="text-sm text-accent">
          Password updated.
        </p>
      )}
      <Button type="submit" loading={saving}>
        Update password
      </Button>
    </form>
  );
}
