"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_EMAILS } from "@/lib/constants";

export function LoginForm({ errorParam }: { errorParam?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(errorParam ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();

    if (!ALLOWED_EMAILS.includes(trimmed)) {
      setError("This email is not authorized to use this app.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmed,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  const errorMessage =
    error === "unauthorized"
      ? "Your email is not authorized to access this app."
      : error === "auth_failed"
        ? "Authentication failed. Please try again."
        : error;

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                       placeholder:text-gray-400 focus:border-blue-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            minLength={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                       placeholder:text-gray-400 focus:border-blue-500
                       focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium
                     text-white hover:bg-gray-800 focus:outline-none focus:ring-2
                     focus:ring-gray-900/20 disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : mode === "signup"
              ? "Create account & sign in"
              : "Sign in"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
          }}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          {mode === "signin"
            ? "First time? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
