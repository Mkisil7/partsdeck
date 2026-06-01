"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ALLOWED_DOMAIN = "adt.com";
  const isAllowedEmail = (value: string) =>
    value.trim().toLowerCase().split("@")[1] === ALLOWED_DOMAIN;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // PartsDeck is restricted to ADT staff.
    if (!isAllowedEmail(email)) {
      setError(`Use your @${ALLOWED_DOMAIN} email address to access PartsDeck.`);
      setLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        // The DB trigger rejects non-@adt.com emails with a generic message.
        setError(
          /email|domain|adt/i.test(error.message)
            ? `Sign-ups are restricted to @${ALLOWED_DOMAIN} email addresses.`
            : error.message,
        );
      } else {
        setMessage("Account created. You can sign in now.");
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-2xl font-black text-navy shadow-gold">
          PD
        </div>
        <h1 className="text-2xl font-bold text-slate-100">PartsDeck</h1>
        <p className="mt-1 text-sm text-slate-400">Truck parts inventory tracker</p>
        <p className="mt-1 text-xs text-slate-500">ADT staff only — sign in with your @adt.com email</p>
      </div>

      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {message && <p className="text-sm text-green-300">{message}</p>}

        <button type="submit" className="btn-gold w-full" disabled={loading}>
          {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        <button
          type="button"
          className="w-full text-center text-sm text-slate-400 hover:text-gold-400"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setError(null);
            setMessage(null);
          }}
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
