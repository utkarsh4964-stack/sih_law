"use client";

import { useState, type FormEvent } from "react";
import { ShieldCheck, Lock, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="pointer-events-none fixed inset-0 opacity-[0.04]" style={{
        backgroundImage:
          "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
        backgroundSize: "42px 42px",
      }} />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[4px] border border-primary/30 bg-primary/10">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-text">LAW1</h1>
          <p className="mt-1 text-sm text-muted">
            Secure Evidence. Intelligent Investigation.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-md border border-border bg-surface p-6"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Email
              </label>
              <div className="flex items-center gap-2 rounded-[4px] border border-border-strong bg-bg px-3 py-2 focus-within:border-primary/60">
                <Mail size={14} className="text-muted" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@law1.gov.in"
                  className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted/60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-muted"
              >
                Password
              </label>
              <div className="flex items-center gap-2 rounded-[4px] border border-border-strong bg-bg px-3 py-2 focus-within:border-primary/60">
                <Lock size={14} className="text-muted" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-text outline-none placeholder:text-muted/60"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-[4px] border border-critical/30 bg-critical/5 px-3 py-2 text-xs text-critical">
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                "Sign in"
              )}
            </Button>
          </div>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Lock size={11} />
          Protected investigation environment. Access is logged and audited.
        </p>
      </div>
    </div>
  );
}
