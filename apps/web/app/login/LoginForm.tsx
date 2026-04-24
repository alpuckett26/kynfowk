"use client";

import { useState, useTransition } from "react";
import { sendMagicLink, type AuthFormState } from "./actions";

export function LoginForm({ headline = "Sign in to Kynfowk" }: { headline?: string }) {
  const [state, setState] = useState<AuthFormState>({ ok: false, message: "" });
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await sendMagicLink(state, formData);
      setState(result);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-warm-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-3xl">💜</p>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{headline}</h1>
          <p className="mt-2 text-sm text-gray-500">
            We&apos;ll email you a magic link. No password required.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="your@email.com"
            className="w-full rounded-full border border-gray-300 px-5 py-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-7 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
          >
            {isPending ? "Sending…" : "Send magic link"}
          </button>
        </form>

        {state.message && (
          <p
            className={`mt-4 rounded-xl px-4 py-3 text-center text-sm ${
              state.ok
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>
    </div>
  );
}
