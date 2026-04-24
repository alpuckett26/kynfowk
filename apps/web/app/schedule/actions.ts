"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ScheduleFormState = { ok: boolean; message: string };

/**
 * Server action: schedule a call for the current user's family.
 * Inserts into calls with status='scheduled'. Stores invited member ids
 * in calls.invited_member_ids (any subset of family_members, validated
 * server-side). RLS (005_calls_rls.sql) enforces family scoping.
 */
export async function scheduleCall(
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();
  // Multiple selections come back as repeated form fields with the same name.
  const invitedIds = formData.getAll("invited").map((v) => String(v));

  if (!title) return { ok: false, message: "Give the call a title." };
  if (!scheduledAt) return { ok: false, message: "Pick a date and time." };

  const when = new Date(scheduledAt);
  if (Number.isNaN(when.getTime())) {
    return { ok: false, message: "Couldn't read the date — try again." };
  }
  if (when.getTime() < Date.now() - 60_000) {
    return { ok: false, message: "Pick a time in the future." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Please sign in first." };
  }

  const { data: me } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!me?.family_id) {
    return {
      ok: false,
      message: "Couldn't find your family. Try signing out and back in.",
    };
  }

  // Validate every invited id belongs to the caller's family. Anything
  // that doesn't is silently dropped — we won't fail the call schedule
  // because of a stale checkbox, but we won't insert foreign ids either.
  let cleanInvited: string[] = [];
  if (invitedIds.length > 0) {
    const { data: validRows } = await supabase
      .from("family_members")
      .select("id")
      .eq("family_id", me.family_id)
      .in("id", invitedIds);
    cleanInvited = (validRows ?? []).map((r) => r.id as string);
  }

  const { error } = await supabase.from("calls").insert({
    family_id: me.family_id,
    title,
    scheduled_at: when.toISOString(),
    status: "scheduled",
    invited_member_ids: cleanInvited,
    participant_count: cleanInvited.length || null,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
