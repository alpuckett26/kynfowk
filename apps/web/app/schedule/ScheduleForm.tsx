"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { scheduleCall, type ScheduleFormState } from "./actions";

const initial: ScheduleFormState = { ok: false, message: "" };

/** Round to the next half-hour for the default scheduled-at value. */
function nextHalfHourLocalString(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  // Format as YYYY-MM-DDTHH:mm in local time for <input type="datetime-local">
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

export function ScheduleForm() {
  const [state, setState] = useState<ScheduleFormState>(initial);
  const [isPending, startTransition] = useTransition();
  const [defaultWhen] = useState(nextHalfHourLocalString);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await scheduleCall(state, formData);
      // On success, scheduleCall calls redirect() which throws —
      // we never reach here. On failure, set the error message.
      setState(result);
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div>
          <label
            htmlFor="title"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            What's the call?
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={120}
            placeholder="Sunday catch-up"
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <div>
          <label
            htmlFor="scheduled_at"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            When?
          </label>
          <input
            id="scheduled_at"
            name="scheduled_at"
            type="datetime-local"
            required
            defaultValue={defaultWhen}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Link
            href="/dashboard"
            className="rounded-full border border-gray-300 px-5 py-2.5 text-center text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-7 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
          >
            {isPending ? "Scheduling…" : "Schedule call"}
          </button>
        </div>

        {state.message && !state.ok && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}
