/**
 * M27 — auto-scheduling engine.
 *
 * Pure logic, called from the daily cron. Resolves every kin pair a user
 * has across every circle they belong to, finds the next overlap window
 * for each pair whose tier cooldown has elapsed, and materializes the
 * call with the right participants. Minors require their managing parent
 * to be available + present.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const HORIZON_DAYS = 14;

type TierId = "immediate" | "close" | "extended" | "distant";

interface MembershipRow {
  id: string;
  user_id: string | null;
  family_circle_id: string;
  display_name: string;
  status: string;
  is_minor: boolean;
  managed_by_membership_id: string | null;
  parental_auto_schedule_consent: boolean;
}

interface KinPair {
  selfMembership: MembershipRow;
  kinMembership: MembershipRow;
  tier: TierId;
  /** Last attended call date between these two memberships. null = never. */
  lastConnectedAt: Date | null;
}

export interface AutoScheduleResult {
  attempted: number;
  scheduled: number;
  skippedByCooldown: number;
  skippedByNoOverlap: number;
  skippedByMinorParent: number;
  skippedByCap: number;
  skippedByConsent: number;
}

export interface AutoScheduleProposal {
  selfMembershipId: string;
  selfDisplayName: string;
  kinMembershipId: string;
  kinDisplayName: string;
  tier: TierId;
  scheduledStart: string;
  scheduledEnd: string;
  participantMembershipIds: string[];
}

export interface AutoScheduleRunOptions {
  /**
   * When true, the engine evaluates every kin pair and returns the
   * would-be calls in `proposals` without inserting anything. Used by
   * the super-admin /api/admin/auto-schedule/run endpoint.
   */
  dryRun?: boolean;
}

export async function runAutoScheduleForUser(
  supabase: SupabaseClient,
  userId: string,
  options: AutoScheduleRunOptions = {}
): Promise<AutoScheduleResult & { proposals: AutoScheduleProposal[] }> {
  const dryRun = Boolean(options.dryRun);
  const proposals: AutoScheduleProposal[] = [];
  const result: AutoScheduleResult = {
    attempted: 0,
    scheduled: 0,
    skippedByCooldown: 0,
    skippedByNoOverlap: 0,
    skippedByMinorParent: 0,
    skippedByCap: 0,
    skippedByConsent: 0,
  };

  const profileResponse = await supabase
    .from("profiles")
    .select(
      "id, auto_schedule_enabled, auto_schedule_paused_until, auto_schedule_max_per_week, timezone"
    )
    .eq("id", userId)
    .maybeSingle();
  const profile = profileResponse.data as
    | {
        id: string;
        auto_schedule_enabled: boolean;
        auto_schedule_paused_until: string | null;
        auto_schedule_max_per_week: number;
        timezone: string;
      }
    | null;
  if (!profile || !profile.auto_schedule_enabled) {
    result.skippedByConsent = 1;
    return { ...result, proposals };
  }
  if (
    profile.auto_schedule_paused_until &&
    new Date(profile.auto_schedule_paused_until).getTime() > Date.now()
  ) {
    result.skippedByConsent = 1;
    return { ...result, proposals };
  }

  // Count auto-scheduled calls already on the calendar in the next 7 days
  // for this user — used for the per-week cap.
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const myMembershipsResponse = await supabase
    .from("family_memberships")
    .select(
      "id, user_id, family_circle_id, display_name, status, is_minor, managed_by_membership_id, parental_auto_schedule_consent"
    )
    .eq("user_id", userId);
  const myMemberships = (myMembershipsResponse.data ?? []) as MembershipRow[];
  if (myMemberships.length === 0) {
    return { ...result, proposals };
  }

  const upcomingResponse = await supabase
    .from("call_sessions")
    .select("id, scheduled_start, status, call_participants(membership_id)")
    .in(
      "family_circle_id",
      myMemberships.map((m) => m.family_circle_id)
    )
    .eq("auto_scheduled", true)
    .gte("scheduled_start", new Date().toISOString())
    .lte("scheduled_start", weekAhead.toISOString())
    .in("status", ["scheduled", "live"]);
  const myMembershipIdSet = new Set(myMemberships.map((m) => m.id));
  let scheduledThisWeek = 0;
  for (const call of upcomingResponse.data ?? []) {
    const participants = call.call_participants as
      | { membership_id: string }[]
      | null;
    if (
      participants?.some((p) => myMembershipIdSet.has(p.membership_id))
    ) {
      scheduledThisWeek += 1;
    }
  }

  // For every membership the user has, resolve kin and try to schedule.
  for (const self of myMemberships) {
    if (self.status !== "active") continue;
    const kinPairs = await resolveKinForMembership(supabase, self);

    for (const pair of kinPairs) {
      result.attempted += 1;

      if (scheduledThisWeek >= profile.auto_schedule_max_per_week) {
        result.skippedByCap += 1;
        continue;
      }

      const tierMinDays = await getTierMinDays(supabase, pair.tier);
      if (tierMinDays === null) {
        result.skippedByCooldown += 1;
        continue;
      }
      if (
        pair.lastConnectedAt &&
        Date.now() - pair.lastConnectedAt.getTime() <
          tierMinDays * 24 * 60 * 60 * 1000
      ) {
        result.skippedByCooldown += 1;
        continue;
      }

      // Skip if the cron already queued a future auto-call for this pair.
      const existingResponse = await supabase
        .from("call_sessions")
        .select(
          "id, scheduled_start, call_participants(membership_id)"
        )
        .eq("family_circle_id", self.family_circle_id)
        .eq("auto_scheduled", true)
        .in("status", ["scheduled", "live"])
        .gte("scheduled_start", new Date().toISOString());
      const alreadyQueued = (existingResponse.data ?? []).some((row) => {
        const participants = (row.call_participants ?? []) as {
          membership_id: string;
        }[];
        return (
          participants.some((p) => p.membership_id === self.id) &&
          participants.some((p) => p.membership_id === pair.kinMembership.id)
        );
      });
      if (alreadyQueued) {
        result.skippedByCooldown += 1;
        continue;
      }

      const requiredMembers = await buildRequiredMembers(supabase, pair);
      if (!requiredMembers) {
        result.skippedByMinorParent += 1;
        continue;
      }

      const slot = await findOverlapWindow(
        supabase,
        pair.selfMembership.family_circle_id,
        requiredMembers.map((m) => m.id),
        HORIZON_DAYS
      );
      if (!slot) {
        result.skippedByNoOverlap += 1;
        continue;
      }

      if (dryRun) {
        proposals.push({
          selfMembershipId: pair.selfMembership.id,
          selfDisplayName: pair.selfMembership.display_name,
          kinMembershipId: pair.kinMembership.id,
          kinDisplayName: pair.kinMembership.display_name,
          tier: pair.tier,
          scheduledStart: slot.startUtc.toISOString(),
          scheduledEnd: slot.endUtc.toISOString(),
          participantMembershipIds: requiredMembers.map((m) => m.id),
        });
        result.scheduled += 1;
        scheduledThisWeek += 1;
        continue;
      }

      const inserted = await materializeAutoCall({
        supabase,
        circleId: pair.selfMembership.family_circle_id,
        creatorUserId: userId,
        participants: requiredMembers,
        tier: pair.tier,
        slot,
        kinName: pair.kinMembership.display_name,
        selfName: pair.selfMembership.display_name,
      });

      if (inserted) {
        result.scheduled += 1;
        scheduledThisWeek += 1;
      } else {
        result.skippedByNoOverlap += 1;
      }
    }
  }

  return { ...result, proposals };
}

// ── Kin resolution ──────────────────────────────────────────────────────────

async function resolveKinForMembership(
  supabase: SupabaseClient,
  self: MembershipRow
): Promise<KinPair[]> {
  // In-circle relationship_edges.
  const edgesResponse = await supabase
    .from("relationship_edges")
    .select("source_membership_id, target_membership_id, kind")
    .eq("family_circle_id", self.family_circle_id)
    .or(
      `source_membership_id.eq.${self.id},target_membership_id.eq.${self.id}`
    );

  // Cross-circle active links.
  const crossResponse = await supabase
    .from("cross_circle_kin_links")
    .select("source_membership_id, target_membership_id, kind, status")
    .or(
      `source_membership_id.eq.${self.id},target_membership_id.eq.${self.id}`
    )
    .eq("status", "active");

  type EdgeRow = {
    source_membership_id: string;
    target_membership_id: string;
    kind: string;
  };

  const partnerIds = new Set<string>();
  const kindByPartnerId = new Map<string, string>();
  for (const edge of [
    ...((edgesResponse.data ?? []) as EdgeRow[]),
    ...((crossResponse.data ?? []) as EdgeRow[]),
  ]) {
    const partnerId =
      edge.source_membership_id === self.id
        ? edge.target_membership_id
        : edge.source_membership_id;
    if (!partnerIds.has(partnerId)) {
      partnerIds.add(partnerId);
      kindByPartnerId.set(partnerId, edge.kind);
    }
  }

  if (partnerIds.size === 0) return [];

  const partnersResponse = await supabase
    .from("family_memberships")
    .select(
      "id, user_id, family_circle_id, display_name, status, is_minor, managed_by_membership_id, parental_auto_schedule_consent"
    )
    .in("id", Array.from(partnerIds));
  const partners = (partnersResponse.data ?? []) as MembershipRow[];

  const tierMap = await getTierMap(supabase);

  const lastConnectedMap = await getLastConnectedMap(
    supabase,
    self.id,
    Array.from(partnerIds)
  );

  return partners
    .filter(
      (p) =>
        p.status === "active" &&
        // Skip minors whose managing parent has paused them.
        (!p.is_minor || p.parental_auto_schedule_consent)
    )
    .map((kin) => {
      const kind = kindByPartnerId.get(kin.id);
      const tier = (kind ? tierMap.get(kind) : null) ?? "distant";
      return {
        selfMembership: self,
        kinMembership: kin,
        tier,
        lastConnectedAt: lastConnectedMap.get(kin.id) ?? null,
      };
    });
}

async function getTierMap(supabase: SupabaseClient): Promise<Map<string, TierId>> {
  const response = await supabase
    .from("relationship_kind_tiers")
    .select("kind, tier");
  const map = new Map<string, TierId>();
  for (const row of (response.data ?? []) as { kind: string; tier: TierId }[]) {
    map.set(row.kind, row.tier);
  }
  return map;
}

async function getTierMinDays(
  supabase: SupabaseClient,
  tier: TierId
): Promise<number | null> {
  const response = await supabase
    .from("connection_tiers")
    .select("min_days_between")
    .eq("id", tier)
    .maybeSingle();
  return (
    (response.data as { min_days_between: number } | null)?.min_days_between ??
    null
  );
}

async function getLastConnectedMap(
  supabase: SupabaseClient,
  selfId: string,
  partnerIds: string[]
): Promise<Map<string, Date>> {
  if (partnerIds.length === 0) return new Map();

  // For each partner, look for the most-recent completed call where both
  // self and partner attended.
  const callsResponse = await supabase
    .from("call_participants")
    .select(
      "membership_id, call_session_id, attended, call_sessions(scheduled_start, status)"
    )
    .in("membership_id", [selfId, ...partnerIds])
    .eq("attended", true);

  const byCall = new Map<
    string,
    { memberIds: Set<string>; start: string; status: string }
  >();
  for (const row of (callsResponse.data ?? []) as Array<{
    membership_id: string;
    call_session_id: string;
    call_sessions:
      | { scheduled_start: string; status: string }
      | { scheduled_start: string; status: string }[]
      | null;
  }>) {
    const session = Array.isArray(row.call_sessions)
      ? row.call_sessions[0]
      : row.call_sessions;
    if (!session) continue;
    if (session.status !== "completed") continue;
    const entry = byCall.get(row.call_session_id) ?? {
      memberIds: new Set<string>(),
      start: session.scheduled_start,
      status: session.status,
    };
    entry.memberIds.add(row.membership_id);
    byCall.set(row.call_session_id, entry);
  }

  const lastConnected = new Map<string, Date>();
  for (const [, entry] of byCall) {
    if (!entry.memberIds.has(selfId)) continue;
    for (const partnerId of partnerIds) {
      if (!entry.memberIds.has(partnerId)) continue;
      const start = new Date(entry.start);
      const existing = lastConnected.get(partnerId);
      if (!existing || start > existing) {
        lastConnected.set(partnerId, start);
      }
    }
  }
  return lastConnected;
}

// ── Minor / parent enforcement ─────────────────────────────────────────────

async function buildRequiredMembers(
  supabase: SupabaseClient,
  pair: KinPair
): Promise<MembershipRow[] | null> {
  const required: MembershipRow[] = [pair.selfMembership, pair.kinMembership];
  const minors = required.filter((m) => m.is_minor);
  if (minors.length === 0) return required;

  for (const minor of minors) {
    if (!minor.parental_auto_schedule_consent) return null;
    if (!minor.managed_by_membership_id) return null;
    const parentResponse = await supabase
      .from("family_memberships")
      .select(
        "id, user_id, family_circle_id, display_name, status, is_minor, managed_by_membership_id, parental_auto_schedule_consent"
      )
      .eq("id", minor.managed_by_membership_id)
      .maybeSingle();
    const parent = parentResponse.data as MembershipRow | null;
    if (!parent || parent.status !== "active") return null;
    if (!required.some((r) => r.id === parent.id)) {
      required.push(parent);
    }
  }
  return required;
}

// ── Overlap window finder ──────────────────────────────────────────────────

interface SlotMatch {
  startUtc: Date;
  endUtc: Date;
}

async function findOverlapWindow(
  supabase: SupabaseClient,
  familyCircleId: string,
  membershipIds: string[],
  lookaheadDays: number
): Promise<SlotMatch | null> {
  const windowsResponse = await supabase
    .from("availability_windows")
    .select("weekday, start_hour, end_hour, membership_id")
    .eq("family_circle_id", familyCircleId)
    .in("membership_id", membershipIds);
  const windows = (windowsResponse.data ?? []) as {
    weekday: number;
    start_hour: number;
    end_hour: number;
    membership_id: string;
  }[];

  // Build a map: hourSlot key (date+hour) → set of membership_ids available.
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  const slots = new Map<string, Set<string>>();

  for (let dayOffset = 0; dayOffset < lookaheadDays; dayOffset += 1) {
    const day = new Date(startDate.getTime() + dayOffset * 86400000);
    const weekday = day.getUTCDay();
    const dayWindows = windows.filter((w) => w.weekday === weekday);
    for (const w of dayWindows) {
      for (let hour = w.start_hour; hour < w.end_hour; hour += 1) {
        const key = `${day.toISOString().slice(0, 10)}T${hour}`;
        const set = slots.get(key) ?? new Set<string>();
        set.add(w.membership_id);
        slots.set(key, set);
      }
    }
  }

  // Find the earliest hour where every required member is available.
  const sortedKeys = [...slots.keys()].sort();
  for (const key of sortedKeys) {
    const set = slots.get(key)!;
    if (membershipIds.every((id) => set.has(id))) {
      const [datePart, hourPart] = key.split("T");
      const [year, month, day] = datePart.split("-").map(Number);
      const hour = Number(hourPart);
      const start = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
      if (start.getTime() <= Date.now()) continue;
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      return { startUtc: start, endUtc: end };
    }
  }
  return null;
}

// ── Materializer ───────────────────────────────────────────────────────────

interface MaterializeArgs {
  supabase: SupabaseClient;
  circleId: string;
  creatorUserId: string;
  participants: MembershipRow[];
  tier: TierId;
  slot: SlotMatch;
  selfName: string;
  kinName: string;
}

async function materializeAutoCall(args: MaterializeArgs): Promise<boolean> {
  const title = `${args.selfName} & ${args.kinName}`;
  const callInsert = await args.supabase
    .from("call_sessions")
    .insert({
      family_circle_id: args.circleId,
      title,
      scheduled_start: args.slot.startUtc.toISOString(),
      scheduled_end: args.slot.endUtc.toISOString(),
      meeting_provider: "Kynfowk",
      reminder_status: "pending",
      auto_scheduled: true,
      auto_schedule_tier: args.tier,
      created_by: args.creatorUserId,
    })
    .select("id")
    .single();
  if (callInsert.error || !callInsert.data) return false;

  const participantsInsert = await args.supabase
    .from("call_participants")
    .insert(
      args.participants.map((m) => ({
        call_session_id: callInsert.data.id,
        membership_id: m.id,
      }))
    );
  if (participantsInsert.error) return false;

  // Activity feed entry.
  await args.supabase.from("family_activity").insert({
    family_circle_id: args.circleId,
    actor_membership_id: args.participants[0].id,
    activity_type: "call_auto_scheduled",
    summary: `Kynfowk scheduled ${title} for ${args.slot.startUtc.toISOString()} (${args.tier} tier).`,
  });

  return true;
}
