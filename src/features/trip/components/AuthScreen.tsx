"use client";

import { useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type AuthScreenProps = {
  supabase: SupabaseClient<Database>;
};

type AuthMode = "sign-in" | "sign-up";

export function AuthScreen({ supabase }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (mode === "sign-up") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          throw signUpError;
        }

        if (!data.session) {
          setMessage("Check your email to confirm your account, then sign in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  return (
    <main className="flex min-h-[calc(100vh-88px)] items-center justify-center px-6 pb-16">
      <section className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
          Roamwise
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {mode === "sign-in" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Sign in to keep your trips and expenses private and synced to your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="authEmail" className="mb-2 block text-sm font-semibold">
              Email
            </label>
            <input
              id="authEmail"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            />
          </div>
          <div>
            <label htmlFor="authPassword" className="mb-2 block text-sm font-semibold">
              Password
            </label>
            <input
              id="authPassword"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10"
            />
            {mode === "sign-up" && (
              <p className="mt-2 text-xs text-slate-500">Use at least 8 characters.</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="text-sm font-medium text-emerald-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-emerald-700 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting
              ? "Please wait..."
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          {mode === "sign-in" ? "New to Roamwise?" : "Already have an account?"}{" "}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => changeMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            className="font-semibold text-emerald-800 underline underline-offset-2"
          >
            {mode === "sign-in" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
}
