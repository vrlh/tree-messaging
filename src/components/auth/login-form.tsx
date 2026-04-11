"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ALLOWED_EMAILS } from "@/lib/constants";

export function LoginForm({ errorParam }: { errorParam?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState(errorParam ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();

    if (!ALLOWED_EMAILS.includes(trimmed)) {
      setError("This email is not authorized to use this app.");
      return;
    }

    setStatus("sending");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setStatus("error");
    } else {
      setStatus("sent");
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
      {status === "sent" ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <h2 className="mb-2 text-lg font-medium text-green-900">
            Check your email
          </h2>
          <p className="text-sm text-green-700">
            We sent a magic link to <strong>{email}</strong>. Click it to sign
            in.
          </p>
        </div>
      ) : (
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

          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium
                       text-white hover:bg-gray-800 focus:outline-none focus:ring-2
                       focus:ring-gray-900/20 disabled:opacity-50"
          >
            {status === "sending" ? "Sending..." : "Send magic link"}
          </button>
        </form>
      )}
    </div>
  );
}
