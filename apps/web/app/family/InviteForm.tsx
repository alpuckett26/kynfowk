"use client";

import { useRef, useState, useTransition } from "react";
import { inviteFamilyMember, type InviteFormState } from "./actions";

const initial: InviteFormState = { ok: false, message: "" };

export function InviteForm() {
  const [state, setState] = useState<InviteFormState>(initial);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await inviteFamilyMember(state, formData);
      setState(result);
      if (result.ok) form.reset();
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div>
        <h3 className="text-base font-semibold text-gray-900">Invite someone</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Email or phone — at least one. Both is even better.
        </p>
      </div>

      <Field
        label="Display name"
        name="display_name"
        placeholder="Margaret"
        required
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="margaret@email.com"
          autoComplete="off"
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          placeholder="+1 555 123 4567"
          autoComplete="off"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="is_elder"
          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
        />
        Mark as an elder family member
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-7 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 sm:w-auto"
      >
        {isPending ? "Inviting…" : "Send invite"}
      </button>

      {state.message && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${
            state.ok
              ? "border border-green-200 bg-green-50 text-green-700"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {!required && <span className="ml-1 text-gray-400">(optional)</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </label>
  );
}
