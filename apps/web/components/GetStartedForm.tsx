"use client";

import { useState, useTransition } from "react";
import { sendMagicLink, type AuthFormState } from "@/app/login/actions";

export function GetStartedForm() {
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
    <div className="space-y-3">
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-3 sm:flex-row sm:justify-center"
      >
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          className="flex-1 rounded-full border border-gray-300 px-5 py-3.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-7 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
        >
          {isPending ? "Sending…" : "Create your family →"}
        </button>
      </form>
      {state.message && (
        <p
          className={`rounded-xl px-4 py-3 text-center text-sm ${
            state.ok
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
