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

async function seedRingCall(
  circleId: string,
  recipientMembershipId: string,
  fakeCallerUserId: string,
  title: string,
): Promise<string> {
  // is_ring=true session with a synthetic created_by (no real auth user
  // needed — the watcher only joins through call_participants for the
  // caller's display_name, which we leave to fall back to "A family
  // member" since fakeCallerUserId has no family_memberships row).
  const now = new Date();
  const end = new Date(now.getTime() + 30 * 60 * 1000);
  const [call] = await fetchSupabase("POST", "call_sessions", {
    family_circle_id: circleId,
    title,
    scheduled_start: now.toISOString(),
    scheduled_end: end.toISOString(),
    status: "scheduled",
    is_ring: true,
    meeting_provider: "Kynfowk",
    reminder_status: "not_needed",
    created_by: fakeCallerUserId,
  });
  await fetchSupabase("POST", "call_participants", {
    call_session_id: call.id,
    membership_id: recipientMembershipId,
  });
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
// These tests are skipped because they require a second test user in the
// same family circle as test@kynfowk.com to act as the caller:
//   - call_sessions.created_by references auth.users(id) — a synthetic
//     UUID fails the FK constraint.
//   - The IncomingCallWatcher explicitly skips rows where created_by ===
//     viewerId, so the test user can't ring themselves.
// Unblock by provisioning test2@kynfowk.com + adding them to the same
// circle, then flip these to `test(...)`. The component-level behaviour
// of IncomingCallWatcher (race-window retry, RLS handling, role="dialog"
// markup) is covered by Vitest unit tests in components/__tests__/.

test.describe("Ring — incoming call watcher (needs second user)", () => {
  test.fixme("modal appears when an is_ring call_session is inserted for the viewer", async () => {
    // see block comment above
  });

  test.fixme("decline button dismisses the modal", async () => {
    // see block comment above
  });
});
