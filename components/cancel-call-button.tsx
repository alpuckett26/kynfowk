"use client";

import { cancelCallAction } from "@/app/actions";

export function CancelCallButton({
  callId,
  familyCircleId
}: {
  callId: string;
  familyCircleId: string;
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm("Cancel this call? This cannot be undone.")) {
      e.preventDefault();
    }
  }

  return (
    <form action={cancelCallAction} onSubmit={handleSubmit}>
      <input name="callId" type="hidden" value={callId} />
      <input name="familyCircleId" type="hidden" value={familyCircleId} />
      <button className="button button-danger" type="submit">
        Cancel this call
      </button>
    </form>
  );
}
