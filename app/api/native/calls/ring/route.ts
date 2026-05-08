/**
 * M42 — POST /api/native/calls/ring
 *
 * Spontaneous "ring now" call. Creates a call_session with
 * scheduled_start = now and is_ring = true, inserts the caller +
 * specified participants into call_participants, and synchronously
 * fires a high-priority push to each participant's registered devices
 * via the Edge Function (lib/send-push.ts) so their phones ring within
 * seconds.
 *
 * The recipient's mobile app routes pushes with type='incoming_call'
 * to /calls/<id>/ring (the incoming-call screen).
 *
 * Caller is responsible for navigating to /calls/<id>/live themselves
 * after the request resolves; the live screen polls for status === "live"
 * to know when the recipient accepted.
 */

import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";
import { sendPush } from "@/lib/send-push";
import { sendExpoPushToUsers } from "@/lib/expo-push";

type Body = {
  participantMembershipIds?: string[];
  /** Optional title; defaults to "Family ring" */
  title?: string;
};

const RING_TIMEOUT_SECONDS = 30;

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;
    const participantMembershipIds = (
      body.participantMembershipIds ?? []
    ).filter((id): id is string => typeof id === "string" && id.length > 0);

    if (participantMembershipIds.length === 0) {
      return Response.json(
        { error: "At least one participant required." },
        { status: 400 }
      );
    }

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active family members can ring." },
        { status: 403 }
      );
    }

    // Resolve all participant memberships in this circle. Reject anyone
    // who's not in the same circle (cross-circle ring isn't supported in
    // V1) or whose user_id is null (placeholder member with no device).
    const partsResponse = await supabase
      .from("family_memberships")
      .select("id, user_id, display_name, family_circle_id, status")
      .in("id", participantMembershipIds);
    const parts = (partsResponse.data ?? []).filter(
      (m): m is {
        id: string;
        user_id: string;
        display_name: string;
        family_circle_id: string;
        status: string;
      } =>
        m !== null &&
        m.status === "active" &&
        m.family_circle_id === family.circle.id &&
        typeof m.user_id === "string"
    );
    if (parts.length === 0) {
      return Response.json(
        { error: "No reachable participants in this circle." },
        { status: 400 }
      );
    }

    const startUtc = new Date();
    const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000);

    const callInsert = await supabase
      .from("call_sessions")
      .insert({
        family_circle_id: family.circle.id,
        title: body.title ?? `${family.membership.display_name} ringing`,
        scheduled_start: startUtc.toISOString(),
        scheduled_end: endUtc.toISOString(),
        meeting_provider: "Kynfowk",
        reminder_status: "not_needed",
        is_ring: true,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (callInsert.error || !callInsert.data) {
      return Response.json(
        { error: callInsert.error?.message ?? "Couldn't open the call." },
        { status: 500 }
      );
    }
    const callId = callInsert.data.id;

    // Caller + every selected participant.
    const allMembershipIds = Array.from(
      new Set([family.membership.id, ...parts.map((p) => p.id)])
    );
    await supabase.from("call_participants").insert(
      allMembershipIds.map((membershipId) => ({
        call_session_id: callId,
        membership_id: membershipId,
      }))
    );

    // Push fan-out — exclude the caller's user_id so we don't ring
    // their own device.
    const recipientUserIds = Array.from(
      new Set(parts.map((p) => p.user_id).filter((id) => id !== user.id))
    );
    const callerName = family.membership.display_name;
    const ringExpiresAt = new Date(
      startUtc.getTime() + RING_TIMEOUT_SECONDS * 1000
    ).toISOString();

    let expoDelivered = 0;
    if (recipientUserIds.length > 0) {
      const ringPayload = {
        userIds: recipientUserIds,
        title: `${callerName} is calling you`,
        body: family.circle.name,
        data: {
          type: "incoming_call" as const,
          deepLink: `kynfowk://calls/${callId}/ring`,
          callId,
          callerName,
          circleName: family.circle.name,
          ringExpiresAt,
        },
      };

      // Two delivery channels — both fire in parallel, both are best-effort.
      // (1) Edge Function `send-notification` reads device_tokens (raw
      //     APNs/FCM tokens). Reserved for any future native register flow.
      // (2) Expo Push reads push_subscriptions where the mobile app
      //     registers via /api/native/push/register. This is the channel
      //     the M98 mobile build actually uses today.
      const [edgeResult, expoResult] = await Promise.allSettled([
        sendPush(ringPayload),
        sendExpoPushToUsers(supabase, ringPayload),
      ]);
      if (edgeResult.status === "rejected") {
        console.error("[ring] edge function push failed:", edgeResult.reason);
      }
      if (expoResult.status === "fulfilled") {
        expoDelivered = expoResult.value.successes;
      } else {
        console.error("[ring] expo push failed:", expoResult.reason);
      }
    }

    return Response.json({
      success: true,
      callId,
      ringExpiresAt,
      participantCount: parts.length,
      pushedTo: recipientUserIds.length,
      expoDelivered,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
