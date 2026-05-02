import { Suspense } from "react";

import { AICallSuggestion } from "@/components/ai-call-suggestion";
import { DashboardShell } from "@/components/dashboard-shell";
import { FamilyPollPopup } from "@/components/family-poll-popup";
import { EarnPanel } from "@/components/panels/earn-panel";
import { FamilyPanel } from "@/components/panels/family-panel";
import { StatusBanner } from "@/components/status-banner";
import {
  getAvailabilityManagementData,
  getCircleCarouselPhotos,
  getDashboardData,
  getFamilyManagementData,
  getNextUnansweredPoll,
  requireViewer,
} from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * M50 — the new home. Server component that fetches the data once,
 * renders the EarnPanel + FamilyPanel as ReactNode slots, and hands
 * everything to the client-side <DashboardShell> which owns the
 * horizontal swipe between Connect / Plan / Earn / Family panels.
 *
 * Structure: status banner + poll popup live as siblings of the shell
 * (they're modals/notices, not panels). The shell itself is full-bleed.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const user = await requireViewer();

  const [data, nextPoll, carouselPhotos, availability, familyData, profileResp] =
    await Promise.all([
      getDashboardData(user.id),
      getNextUnansweredPoll(user.id),
      getCircleCarouselPhotos(user.id),
      getAvailabilityManagementData(user.id),
      getFamilyManagementData(user.id),
      (async () => {
        const supabase = await createSupabaseServerClient();
        return supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();
      })(),
    ]);

  const fullName = (profileResp.data as { full_name: string | null } | null)?.full_name ?? "";
  const firstName = fullName.trim().split(/\s+/)[0] || "friend";

  const earnPanel = (
    <EarnPanel
      userId={user.id}
      connectionScore={data.stats.connectionScore}
      weeklyStreak={data.stats.weeklyStreak}
    />
  );

  const familyPanel = (
    <FamilyPanel
      familyCircleId={familyData.circle.id}
      viewerMembershipId={familyData.viewer.membershipId}
      canManage={familyData.viewer.canManage}
      members={familyData.members}
      carouselPhotos={carouselPhotos}
    />
  );

  return (
    <>
      {params?.status ? (
        <div className="container" style={{ paddingTop: "0.75rem" }}>
          <StatusBanner code={params.status} />
        </div>
      ) : null}

      <DashboardShell
        connect={{
          firstName,
          circleName: data.circle.name,
          circleId: data.circle.id,
          readiness: data.readiness,
          stats: { completedCalls: data.stats.completedCalls },
          upcomingCalls: data.upcomingCalls.map((c) => ({
            id: c.id,
            title: c.title,
            scheduled_start: c.scheduled_start,
            scheduled_end: c.scheduled_end,
            show_recovery_prompt: c.show_recovery_prompt,
            suggested_reschedule_start: c.suggested_reschedule_start,
            suggested_reschedule_end: c.suggested_reschedule_end,
          })),
          members: data.memberships.map((m) => ({
            id: m.id,
            displayName: m.display_name,
            status: m.status,
          })),
          timezone: data.viewerTimezone,
        }}
        plan={{
          familyCircleId: data.circle.id,
          currentSlots: availability.currentSlots,
          suggestions: data.suggestions,
          timezone: data.viewerTimezone,
          aiSuggestion: (
            <Suspense fallback={<div className="ai-suggestion-skeleton" />}>
              <AICallSuggestion
                familyCircleId={data.circle.id}
                suggestions={data.suggestions}
                timezone={data.viewerTimezone}
                userId={user.id}
              />
            </Suspense>
          ),
        }}
        earnPanel={earnPanel}
        familyPanel={familyPanel}
      />

      {nextPoll ? <FamilyPollPopup poll={nextPoll} /> : null}
    </>
  );
}
