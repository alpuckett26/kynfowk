"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Manually mark a call as completed or missed. Used on the history
 * page for past calls that were scheduled but never joined (so the
 * room-disconnect path didn't fire).
 */
export async function markCallStatus(formData: FormData): Promise<void> {
  const callId = String(formData.get("call_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!callId) return;
  if (status !== "completed" && status !== "missed") return;

  const supabase = createClient();
  await supabase
    .from("calls")
    .update({ status })
    .eq("id", callId);

  revalidatePath("/history");
  revalidatePath("/dashboard");
}
