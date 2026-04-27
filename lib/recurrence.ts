import type { SupabaseClient } from "@supabase/supabase-js";

export type Frequency = "weekly" | "biweekly" | "monthly";

export interface RecurrenceRuleRow {
  id: string;
  family_circle_id: string;
  title: string;
  description: string | null;
  frequency: Frequency;
  day_of_week: number | null;
  day_of_month: number | null;
  start_local_time: string; // 'HH:MM:SS'
  duration_minutes: number;
  timezone: string;
  active: boolean;
  last_materialized_through: string | null;
  created_by_membership_id: string | null;
}

const HORIZON_DAYS = 28;
const STEP_DAYS = { weekly: 7, biweekly: 14 } as const;

export function nextOccurrences(
  rule: RecurrenceRuleRow,
  fromUtc: Date,
  throughUtc: Date
): Date[] {
  const out: Date[] = [];
  const tz = rule.timezone;

  let cursor = startOfNextOccurrence(rule, fromUtc, tz);
  while (cursor && cursor.getTime() < throughUtc.getTime()) {
    if (cursor.getTime() >= fromUtc.getTime()) {
      out.push(cursor);
    }
    cursor = advanceOnce(rule, cursor, tz);
    // Safety: never produce more than ~120 instances per pass.
    if (out.length > 120) break;
  }
  return out;
}

function startOfNextOccurrence(
  rule: RecurrenceRuleRow,
  fromUtc: Date,
  tz: string
): Date {
  const local = utcToZoned(fromUtc, tz);
  const [hh, mm] = parseHHMM(rule.start_local_time);

  if (rule.frequency === "weekly" || rule.frequency === "biweekly") {
    const targetDow = rule.day_of_week ?? local.getUTCDay();
    let candidate = new Date(local);
    const dowDelta = (targetDow - candidate.getUTCDay() + 7) % 7;
    candidate.setUTCDate(candidate.getUTCDate() + dowDelta);
    candidate.setUTCHours(hh, mm, 0, 0);
    if (candidate.getTime() < local.getTime()) {
      candidate.setUTCDate(candidate.getUTCDate() + 7);
    }
    return zonedToUtc(candidate, tz);
  }

  // monthly
  const dom = rule.day_of_month ?? local.getUTCDate();
  let candidate = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), dom, hh, mm, 0, 0)
  );
  if (candidate.getTime() < local.getTime()) {
    candidate = new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, dom, hh, mm, 0, 0)
    );
  }
  return zonedToUtc(candidate, tz);
}

function advanceOnce(
  rule: RecurrenceRuleRow,
  currentUtc: Date,
  tz: string
): Date {
  if (rule.frequency === "weekly" || rule.frequency === "biweekly") {
    const stepDays = STEP_DAYS[rule.frequency];
    return new Date(currentUtc.getTime() + stepDays * 24 * 60 * 60 * 1000);
  }
  // monthly: advance to the same day_of_month next month
  const local = utcToZoned(currentUtc, tz);
  const [hh, mm] = parseHHMM(rule.start_local_time);
  const dom = rule.day_of_month ?? local.getUTCDate();
  const next = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, dom, hh, mm, 0, 0)
  );
  return zonedToUtc(next, tz);
}

function parseHHMM(s: string): [number, number] {
  const parts = s.split(":");
  return [Number(parts[0] ?? 0), Number(parts[1] ?? 0)];
}

// Approximate timezone math by treating all bookkeeping in UTC and only
// applying the named-tz offset at materialization time. Good enough for
// scheduling — DST transitions may shift by an hour.
function utcToZoned(utc: Date, tz: string): Date {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = Object.fromEntries(
      fmt.formatToParts(utc).map((p) => [p.type, p.value])
    );
    return new Date(
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour) % 24,
        Number(parts.minute),
        Number(parts.second ?? 0)
      )
    );
  } catch {
    return utc;
  }
}

function zonedToUtc(zoned: Date, tz: string): Date {
  const offsetMs = zoned.getTime() - utcToZoned(zoned, tz).getTime();
  return new Date(zoned.getTime() + offsetMs);
}

/**
 * Run materializeRecurrence for every active rule. Used by both the
 * scheduled cron and the super-admin "trigger now" button.
 */
export async function materializeAllRecurrences(
  supabase: SupabaseClient
): Promise<{ totalInserted: number; perRule: { id: string; inserted: number }[] }> {
  const rulesResponse = await supabase
    .from("call_recurrence_rules")
    .select(
      "id, family_circle_id, title, description, frequency, day_of_week, day_of_month, start_local_time, duration_minutes, timezone, active, last_materialized_through, created_by_membership_id"
    )
    .eq("active", true);
  if (rulesResponse.error) {
    throw new Error(rulesResponse.error.message);
  }
  let totalInserted = 0;
  const perRule: { id: string; inserted: number }[] = [];
  for (const rule of (rulesResponse.data ?? []) as RecurrenceRuleRow[]) {
    try {
      const r = await materializeRecurrence(supabase, rule);
      perRule.push({ id: rule.id, inserted: r.inserted });
      totalInserted += r.inserted;
    } catch (e) {
      console.error("[recurrence] rule failed", rule.id, e);
    }
  }
  return { totalInserted, perRule };
}

export async function materializeRecurrence(
  supabase: SupabaseClient,
  rule: RecurrenceRuleRow,
  createdByUserId?: string
): Promise<{ inserted: number }> {
  const now = new Date();
  const horizonEnd = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);
  const lastThrough = rule.last_materialized_through
    ? new Date(rule.last_materialized_through)
    : now;
  const startFrom = lastThrough.getTime() > now.getTime() ? lastThrough : now;

  const occurrences = nextOccurrences(rule, startFrom, horizonEnd);
  if (occurrences.length === 0) {
    return { inserted: 0 };
  }

  // call_sessions.created_by is NOT NULL — we need a user id. Prefer the
  // user driving the request; otherwise resolve via the rule's creating
  // membership; otherwise fall back to the circle's owner.
  let createdBy = createdByUserId ?? null;
  if (!createdBy && rule.created_by_membership_id) {
    const membershipResponse = await supabase
      .from("family_memberships")
      .select("user_id")
      .eq("id", rule.created_by_membership_id)
      .maybeSingle();
    createdBy = (membershipResponse.data as { user_id: string | null } | null)?.user_id ?? null;
  }
  if (!createdBy) {
    const circleResponse = await supabase
      .from("family_circles")
      .select("created_by")
      .eq("id", rule.family_circle_id)
      .maybeSingle();
    createdBy = (circleResponse.data as { created_by: string | null } | null)?.created_by ?? null;
  }
  if (!createdBy) {
    return { inserted: 0 };
  }

  const ownerResponse = await supabase
    .from("family_memberships")
    .select("id")
    .eq("family_circle_id", rule.family_circle_id)
    .eq("status", "active");
  const memberIds = (ownerResponse.data ?? []).map((m) => m.id);

  let inserted = 0;
  for (const startUtc of occurrences) {
    const endUtc = new Date(startUtc.getTime() + rule.duration_minutes * 60 * 1000);

    const callInsert = await supabase
      .from("call_sessions")
      .insert({
        family_circle_id: rule.family_circle_id,
        title: rule.title,
        scheduled_start: startUtc.toISOString(),
        scheduled_end: endUtc.toISOString(),
        meeting_provider: "Kynfowk",
        reminder_status: "pending",
        recurrence_rule_id: rule.id,
        created_by: createdBy,
      })
      .select("id")
      .single();
    if (callInsert.error || !callInsert.data) continue;

    if (memberIds.length) {
      await supabase.from("call_participants").insert(
        memberIds.map((id) => ({
          call_session_id: callInsert.data.id,
          membership_id: id,
        }))
      );
    }
    inserted += 1;
  }

  await supabase
    .from("call_recurrence_rules")
    .update({ last_materialized_through: horizonEnd.toISOString() })
    .eq("id", rule.id);

  return { inserted };
}
