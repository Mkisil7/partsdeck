"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Status = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const statusRef = useRef<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function markStatus(s: Status) {
    statusRef.current = s;
    setStatus(s);
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    // The client auto-exchanges the ?code= from the email link on init and
    // fires an auth event once the recovery session exists. Listen for it,
    // and also check for an already-established session.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) markStatus("ready");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) markStatus("ready");
    });

    // Fallback: if the auto-exchange hasn't produced a session shortly after
    // load, try the exchange manually; if that fails the link is dead.
    const timer = setTimeout(async () => {
      if (cancelled || statusRef.current !== "checking") return;
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled && statusRef.current === "checking") {
          markStatus(error ? "invalid" : "ready");
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (!cancelled && statusRef.current === "checking") {
          markStatus(data.session ? "ready" : "invalid");
        }
      }
    }, 1500);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-2xl font-black text-navy shadow-gold">
          PD
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Reset password</h1>
        <p className="mt-1 text-sm text-slate-400">
          Choose a new password for your PartsDeck account
        </p>
      </div>

      {status === "checking" && (
        <div className="card w-full max-w-sm text-center text-sm text-slate-400">
          Verifying your reset link…
        </div>
      )}

      {status === "invalid" && (
        <div className="card w-full max-w-sm space-y-3 text-center">
          <p className="text-sm text-red-300">
            This reset link is invalid or has expired.
          </p>
          <p className="text-sm text-slate-400">
            Request a new one from the sign-in page.
          </p>
          <Link href="/login" className="btn-gold block w-full">
            Back to sign in
          </Link>
        </div>
      )}

      {status === "ready" && (
        <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
          <div>
            <label className="label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="confirm-password">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button type="submit" className="btn-gold w-full" disabled={saving}>
            {saving ? "Saving…" : "Set new password"}
          </button>
        </form>
      )}
    </main>
  );
}
