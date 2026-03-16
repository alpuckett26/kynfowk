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
    await expect(page.getByText("E2E Test Call")).toBeVisible({ timeout: 10000 });
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

    // Submit
    await page.getByRole("button", { name: "Save completed call" }).click();

    // Should redirect back to the call page with success status
    await page.waitForURL(/\/calls\/.+/, { timeout: 15000 });

    // Status card now shows Completed
    await expect(page.getByText("Completed").first()).toBeVisible({ timeout: 10000 });
  });

  test("completed call shows attendance summary", async ({ page }) => {
    await page.goto(`/calls/${seededCallId}`);
    await expect(page.getByRole("heading", { name: "Attendance summary" })).toBeVisible();
  });

  test("completed call shows post-call recap form", async ({ page }) => {
    await page.goto(`/calls/${seededCallId}`);
    await expect(page.getByRole("heading", { name: "Post-call recap" })).toBeVisible();
  });

  test("completed call no longer shows Complete this call form", async ({ page }) => {
    await page.goto(`/calls/${seededCallId}`);
    await expect(page.getByRole("heading", { name: "Complete this call" })).not.toBeVisible();
  });

  test("completed call appears as completed on dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Completed calls move out of Upcoming — check stats reflect the completion
    await expect(page.getByText(/completed calls/i).first()).toBeVisible();
  });
});
