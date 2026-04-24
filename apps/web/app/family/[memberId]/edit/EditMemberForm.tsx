"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  updateFamilyMember,
  removeFamilyMember,
  type MemberFormState,
} from "../../actions";

const initial: MemberFormState = { ok: false, message: "" };

export type EditableMember = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  is_elder: boolean;
  /** True when this member has linked to an auth.users row — they
   * cannot be removed via the invitee delete path. */
  claimed: boolean;
};

export function EditMemberForm({ member }: { member: EditableMember }) {
  const [state, setState] = useState<MemberFormState>(initial);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("member_id", member.id);
    startTransition(async () => {
      const result = await updateFamilyMember(state, formData);
      setState(result);
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <Field
          label="Display name"
          name="display_name"
          required
          defaultValue={member.display_name}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Email"
            name="email"
            type="email"
            defaultValue={member.email ?? ""}
          />
          <Field
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={member.phone ?? ""}
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="is_elder"
            defaultChecked={member.is_elder}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
          />
          Elder family member
        </label>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/family"
            className="rounded-full border border-gray-300 px-5 py-2.5 text-center text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-gradient-to-r from-brand-500 to-purple-600 px-7 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save changes"}
          </button>
        </div>

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

      {!member.claimed && (
        <form
          action={removeFamilyMember}
          className="rounded-2xl border border-red-100 bg-red-50/50 p-5"
        >
          <input type="hidden" name="member_id" value={member.id} />
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h4 className="text-sm font-semibold text-red-800">
                Remove invitee
              </h4>
              <p className="text-xs text-red-700/80">
                Deletes this invite. They&apos;ll need to be re-invited.
              </p>
            </div>
            <button
              type="submit"
              className="rounded-full bg-red-600 px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
      />
    </label>
  );
}
