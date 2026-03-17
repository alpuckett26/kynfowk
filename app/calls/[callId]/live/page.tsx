import { redirect } from "next/navigation";

import { CallRoom } from "@/components/call-room";
import { getViewerFamilyCircle, requireViewer } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LiveCallPage({
  params
}: {
  params: Promise<{ callId: string }>;
}) {
  const { callId } = await params;
  const user = await requireViewer();
  const family = await getViewerFamilyCircle(user.id);

  if (!family || family.membership.status !== "active") {
    redirect("/dashboard");
  }

  const supabase = await createSupabaseServerClient();
  const callResponse = await supabase
    .from("call_sessions")
    .select("id, title, status, family_circle_id")
    .eq("id", callId)
    .maybeSingle();

  const call = callResponse.data;
  if (!call || call.family_circle_id !== family.circle.id) {
    redirect("/dashboard?status=completion-missing");
  }

  if (call.status !== "scheduled" && call.status !== "live") {
    redirect(`/calls/${callId}`);
  }

  return (
    <CallRoom
      callId={call.id}
      callTitle={call.title}
      familyCircleId={family.circle.id}
      membershipId={family.membership.id}
      displayName={family.membership.display_name}
    />
  );
}
