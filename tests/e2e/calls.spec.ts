import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Supabase REST helpers (service role — bypasses RLS for test seeding)
// Uses Node native fetch to avoid Playwright browser-header detection.
// ---------------------------------------------------------------------------

function supabaseHeaders(extra?: Record<string, string>) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.test");
  }
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...extra
  };
}

function supabaseUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;
}

async function fetchSupabase(method: string, path: string, body?: object) {
  const response = await fetch(supabaseUrl(path), {
    method,
    headers: supabaseHeaders(),
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    throw new Error(`Supabase ${method} ${path} failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Seed / teardown helpers
// ---------------------------------------------------------------------------

async function getTestUser() {
  const email = process.env.TEST_USER_EMAIL!;
  const rows = await fetchSupabase(
    "GET",
    `profiles?email=eq.${encodeURIComponent(email)}&select=id,email&limit=1`
  );
  if (!rows.length) throw new Error(`Test user ${email} not found in profiles table`);
  return rows[0] as { id: string; email: string };
}

async function getFamilyCircleId(userId: string): Promise<string> {
  const rows = await fetchSupabase(
    "GET",
    `family_memberships?user_id=eq.${userId}&status=eq.active&select=family_circle_id&limit=1`
  );
  if (!rows.length) throw new Error("Test user has no active family circle membership");
  return rows[0].family_circle_id;
}

async function getMembershipId(userId: string, circleId: string): Promise<string> {
  const rows = await fetchSupabase(
    "GET",
    `family_memberships?user_id=eq.${userId}&family_circle_id=eq.${circleId}&select=id&limit=1`
  );
  if (!rows.length) throw new Error("Membership not found");
  return rows[0].id;
}

async function seedScheduledCall(circleId: string, membershipId: string, userId: string): Promise<string> {
  const start = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const [call] = await fetchSupabase("POST", "call_sessions", {
    family_circle_id: circleId,
    title: "E2E Test Call",
    scheduled_start: start.toISOString(),
    scheduled_end: end.toISOString(),
    status: "scheduled",
    created_by: userId,
    reminder_status: "pending"
  });

  await fetchSupabase("POST", "call_participants", {
    call_session_id: call.id,
    membership_id: membershipId
  });

  return call.id;
}

async function deleteTestCall(callId: string) {
  await fetch(supabaseUrl(`call_participants?call_session_id=eq.${callId}`), { method: "DELETE", headers: supabaseHeaders() });
  await fetch(supabaseUrl(`call_recaps?call_session_id=eq.${callId}`), { method: "DELETE", headers: supabaseHeaders() });
  await fetch(supabaseUrl(`call_sessions?id=eq.${callId}`), { method: "DELETE", headers: supabaseHeaders() });
}

async function seedRingCall(args: {
  circleId: string;
  callerUserId: string;
  callerMembershipId: string;
  recipientMembershipId: string;
  title: string;
}): Promise<string> {
  // is_ring=true session created BY the caller. Both caller and
  // recipient go into call_participants so the watcher can resolve
  // the caller's display_name via the family_memberships join.
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 60 * 1000);
  const [call] = await fetchSupabase("POST", "call_sessions", {
    family_circle_id: args.circleId,
    title: args.title,
    scheduled_start: now.toISOString(),
    scheduled_end: end.toISOString(),
    status: "scheduled",
    is_ring: true,
    meeting_provider: "Kynfowk",
    reminder_status: "not_needed",
    created_by: args.callerUserId,
  });
  await fetchSupabase("POST", "call_participants", [
    { call_session_id: call.id, membership_id: args.callerMembershipId },
    { call_session_id: call.id, membership_id: args.recipientMembershipId },
  ]);
  return call.id;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe.configure({ mode: "serial" });

let seededCallId: string;

test.beforeAll(async () => {
  const user = await getTestUser();
  const circleId = await getFamilyCircleId(user.id);
  const membershipId = await getMembershipId(user.id, circleId);
  seededCallId = await seedScheduledCall(circleId, membershipId, user.id);
});

test.afterAll(async () => {
  if (seededCallId) {
    await deleteTestCall(seededCallId);
  }
});

// ── Origination ─────────────────────────────────────────────────────────────

test.describe("Call origination", () => {
  test("call detail page loads and shows Scheduled status", async ({ page }) => {
    await page.goto(`/calls/${seededCallId}`);
    await expect(page.getByRole("heading", { name: "E2E Test Call" })).toBeVisible();
    await expect(page.getByText("Scheduled").first()).toBeVisible();
  });

  test("seeded call appears in Upcoming calls on dashboard", async ({ page }) => {
    // Hard reload to bypass Next.js cache
    await page.goto(`/dashboard?t=${Date.now()}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("E2E Test Call").first()).toBeVisible({ timeout: 10000 });
  });

  test("call detail shows the scheduled participant", async ({ page }) => {
    await page.goto(`/calls/${seededCallId}`);
    await expect(page.getByText("Family members for this call")).toBeVisible();
    await expect(page.getByText("Scheduled to join")).toBeVisible();
  });

  test("call detail has Complete this call form", async ({ page }) => {
    await page.goto(`/calls/${seededCallId}`);
    await expect(page.getByRole("heading", { name: "Complete this call" })).toBeVisible();
    await expect(page.getByLabel("Minutes shared")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save completed call" })).toBeVisible();
  });
});

// ── Termination ─────────────────────────────────────────────────────────────

test.describe("Call termination", () => {
  test("completing a call transitions it to Completed status", async ({ page }) => {
    await page.goto(`/calls/${seededCallId}`);

    // Fill in duration
    const durationInput = page.getByLabel("Minutes shared");
    await durationInput.fill("30");

    // Submit — success redirects to /dashboard, so wait for navigation
    await Promise.all([
      page.waitForNavigation({ timeout: 15000, waitUntil: "commit" }),
      page.getByRole("button", { name: "Save completed call" }).click()
    ]);

    // Navigate to the call page to verify Completed status
    await page.goto(`/calls/${seededCallId}?t=${Date.now()}`);

    // Status card now shows Completed
    await expect(page.getByText("Completed").first()).toBeVisible({ timeout: 10000 });
  });

  test("verify call is completed in DB", async () => {
    const callData = await fetchSupabase("GET", `call_sessions?id=eq.${seededCallId}&select=id,status`);
    expect(callData[0]?.status).toBe("completed");
  });

  test("completed call shows attendance summary", async ({ page }) => {
    // Cache-bust to ensure fresh server-side render after completion
    await page.goto(`/calls/${seededCallId}?t=${Date.now()}`);
    await expect(page.getByRole("heading", { name: "Attendance summary" })).toBeVisible({ timeout: 10000 });
  });

  test("completed call shows post-call recap form", async ({ page }) => {
    await page.goto(`/calls/${seededCallId}?t=${Date.now()}`);
    await expect(page.getByRole("heading", { name: "Post-call recap" })).toBeVisible();
  });

  test("completed call no longer shows Complete this call form", async ({ page }) => {
    await page.goto(`/calls/${seededCallId}?t=${Date.now()}`);
    await expect(page.getByRole("heading", { name: "Complete this call" })).not.toBeVisible();
  });

  test("completed call no longer appears in dashboard upcoming list", async ({ page }) => {
    await page.goto(`/dashboard?t=${Date.now()}`);
    // Post-M50 Connect panel shows readiness meta like "X% ready · Y upcoming · Z done".
    // After completion the seeded call should not appear in the upcoming list.
    await expect(page.getByText(/% ready/i).first()).toBeVisible();
    await expect(page.getByText("E2E Test Call")).not.toBeVisible();
  });
});

// ── Ring (incoming-call watcher) ────────────────────────────────────────────
//
// Uses test2@kynfowk.com (seeded via scripts/seed-test-user2.mjs) as the
// caller and test@kynfowk.com as the recipient. The IncomingCallWatcher
// is mounted globally in app/layout.tsx; mounting /dashboard gives the
// Realtime subscription time to attach before we seed.

test.describe("Ring — incoming call watcher", () => {
  let caller: { userId: string; membershipId: string };
  let recipient: { userId: string; membershipId: string; circleId: string };
  let ringCallId: string | null = null;

  test.beforeAll(async () => {
    const primary = await getTestUser();
    const circleId = await getFamilyCircleId(primary.id);
    const recipientMembershipId = await getMembershipId(primary.id, circleId);

    const caller2Email = process.env.TEST_USER2_EMAIL;
    if (!caller2Email) {
      throw new Error(
        "TEST_USER2_EMAIL not set — run scripts/seed-test-user2.mjs first.",
      );
    }
    const caller2 = (await fetchSupabase(
      "GET",
      `profiles?email=eq.${encodeURIComponent(caller2Email)}&select=id&limit=1`,
    )) as Array<{ id: string }>;
    if (!caller2.length) {
      throw new Error(
        `Caller user ${caller2Email} not found — run scripts/seed-test-user2.mjs.`,
      );
    }
    const callerMembershipId = await getMembershipId(caller2[0].id, circleId);

    caller = { userId: caller2[0].id, membershipId: callerMembershipId };
    recipient = {
      userId: primary.id,
      membershipId: recipientMembershipId,
      circleId,
    };
  });

  test.afterEach(async () => {
    if (ringCallId) {
      await deleteTestCall(ringCallId);
      ringCallId = null;
    }
  });

  test("modal appears when an is_ring call_session is inserted for the viewer", async ({ page }) => {
    // Mount the dashboard so the global IncomingCallWatcher subscribes
    // to Realtime before we seed the ring. The watcher attaches after
    // supabase.auth.getUser() resolves — give it a beat.
    await page.goto(`/dashboard?t=${Date.now()}`);
    await expect(page.getByText(/% ready/i).first()).toBeVisible();
    await page.waitForTimeout(1500);

    ringCallId = await seedRingCall({
      circleId: recipient.circleId,
      callerUserId: caller.userId,
      callerMembershipId: caller.membershipId,
      recipientMembershipId: recipient.membershipId,
      title: "E2E Ring Test",
    });

    // Watcher renders <div role="dialog" aria-modal="true"> with the
    // copy "is calling you on Kynfowk…". Generous timeout: Realtime +
    // the 8×200ms participants retry can push delivery to ~3s.
    const dialog = page.getByRole("dialog").filter({
      hasText: /is calling you on Kynfowk/i,
    });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    // Scope the caller-name check to the dialog so it doesn't match
    // the same name rendered in the Family panel below.
    await expect(dialog.getByText(/Test User 2/i)).toBeVisible();
  });

  test("decline button dismisses the modal", async ({ page }) => {
    await page.goto(`/dashboard?t=${Date.now()}`);
    await expect(page.getByText(/% ready/i).first()).toBeVisible();
    await page.waitForTimeout(1500);

    ringCallId = await seedRingCall({
      circleId: recipient.circleId,
      callerUserId: caller.userId,
      callerMembershipId: caller.membershipId,
      recipientMembershipId: recipient.membershipId,
      title: "E2E Ring Decline",
    });

    const dialog = page.getByRole("dialog").filter({
      hasText: /is calling you on Kynfowk/i,
    });
    await expect(dialog).toBeVisible({ timeout: 10000 });
    // force:true — the modal has a CSS pulse/animation on the action
    // buttons that Playwright reads as "not stable". The button is
    // visible + enabled; forcing the click is safe.
    await dialog
      .getByRole("button", { name: /^Decline$/i })
      .click({ force: true });
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });
});
