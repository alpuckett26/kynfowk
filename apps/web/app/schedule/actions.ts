"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ScheduleFormState = { ok: boolean; message: string };

/**
 * Server action: schedule a call for the current user's family.
 * Inserts into calls with status='scheduled'. RLS (005_calls_rls.sql)
 * enforces that family_id must match current_family_id().
 */
export async function scheduleCall(
  _prev: ScheduleFormState,
  formData: FormData
): Promise<ScheduleFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();

  if (!title) return { ok: false, message: "Give the call a title." };
  if (!scheduledAt) return { ok: false, message: "Pick a date and time." };

  // datetime-local sends "YYYY-MM-DDTHH:mm" without timezone — parse as local.
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

  // Resolve family_id for the current user — needed to satisfy the
  // INSERT RLS check (family_id = current_family_id()).
  const { data: member } = await supabase
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member?.family_id) {
    return {
      ok: false,
      message: "Couldn't find your family. Try signing out and back in.",
    };
  }

  const { error } = await supabase.from("calls").insert({
    family_id: member.family_id,
    title,
    scheduled_at: when.toISOString(),
    status: "scheduled",
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
