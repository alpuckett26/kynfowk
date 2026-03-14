import type { Database } from "@/lib/database.types";
import type { PilotFeedbackCategory, ProductEventName } from "@/lib/types";

type AppSupabaseClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createSupabaseServerClient>
>;

export async function trackProductEvent(
  supabase: AppSupabaseClient,
  input: {
    eventName: ProductEventName;
    userId?: string | null;
    familyCircleId?: string | null;
    callSessionId?: string | null;
    metadata?: Database["public"]["Tables"]["product_events"]["Insert"]["metadata"];
  }
) {
  await supabase.from("product_events").insert({
    event_name: input.eventName,
    user_id: input.userId ?? null,
    family_circle_id: input.familyCircleId ?? null,
    call_session_id: input.callSessionId ?? null,
    metadata: input.metadata ?? null
  });
}

export async function savePilotFeedback(
  supabase: AppSupabaseClient,
  input: {
    userId: string;
    category: PilotFeedbackCategory;
    message: string;
    familyCircleId?: string | null;
    callSessionId?: string | null;
    pagePath?: string | null;
  }
) {
  return supabase.from("pilot_feedback").insert({
    user_id: input.userId,
    category: input.category,
    message: input.message,
    family_circle_id: input.familyCircleId ?? null,
    call_session_id: input.callSessionId ?? null,
    page_path: input.pagePath ?? null
  });
}
