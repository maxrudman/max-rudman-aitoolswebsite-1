"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";
import { Button, Card, Field } from "./ui";

export const DEMO = { username: "demo", password: "demo12345" };

export function AuthForm({ mode, showDemo }: { mode: "login" | "signup"; showDemo: boolean }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const isSignup = mode === "signup";

  async function submit(creds?: { username: string; password: string }) {
    setError("");
    setFieldErrors({});
    const body = creds ?? { username, password, ...(isSignup ? { confirmPassword } : {}) };

    // Quick client-side checks; the server validates everything again.
    if (!creds && isSignup) {
      const errs: Record<string, string> = {};
      if (username.trim().length < 3) errs.username = "Username must be at least 3 characters.";
      if (password.length < 8) errs.password = "Password must be at least 8 characters.";
      if (password !== confirmPassword) errs.confirmPassword = "Passwords don't match.";
      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        return;
      }
    }

    setLoading(true);
    try {
      await api(isSignup && !creds ? "/api/auth/signup" : "/api/auth/login", { body });
      router.replace("/vocabulary");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors);
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <span aria-hidden="true" className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-accent text-lg font-semibold text-white">
            S
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{isSignup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-1.5 text-muted">Build your vocabulary. Practice your answers out loud.</p>
        </div>

        <Card className="p-6">
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-4"
          >
            <Field label="Username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} error={fieldErrors.username} required />
            <Field
              label="Password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              hint={isSignup ? "At least 8 characters." : undefined}
              required
            />
            {isSignup && (
              <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={fieldErrors.confirmPassword} required />
            )}
            {error && !Object.keys(fieldErrors).length && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {isSignup ? "Sign up" : "Log in"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          {isSignup ? "Already have an account? " : "New here? "}
          <Link href={isSignup ? "/login" : "/signup"} className="font-medium text-accent underline-offset-4 hover:underline">
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
        {showDemo && !isSignup && (
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => submit(DEMO)} disabled={loading}>
              Try the demo account
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
