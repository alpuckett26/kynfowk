#!/usr/bin/env node
/**
 * Seed test2@kynfowk.com into the hosted Supabase so the ring-now E2E
 * tests have a second user to act as the caller.
 *
 * Idempotent: re-running is a no-op if the user + membership already
 * exist. Safe to run any time.
 *
 * Run:
 *   npx dotenv -e .env.test -- node scripts/seed-test-user2.mjs
 *
 * Requires the following env vars (sourced from .env.test):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   TEST_USER_EMAIL          // the primary test user (anchors the circle)
 *   TEST_USER2_EMAIL         // the new user we're seeding
 *   TEST_USER2_PASSWORD      // password to set for them
 *
 * Output: prints the new user's id + membership id on success.
 */

import { createClient } from "@supabase/supabase-js";

const {
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TEST_USER_EMAIL,
  TEST_USER2_EMAIL,
  TEST_USER2_PASSWORD,
} = process.env;

const missing = Object.entries({
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  TEST_USER_EMAIL,
  TEST_USER2_EMAIL,
  TEST_USER2_PASSWORD,
})
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length) {
  console.error("Missing env vars:", missing.join(", "));
  process.exit(1);
}

const supabase = createClient(
  NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ---------------------------------------------------------------------------
// 1. Find or create the auth user
// ---------------------------------------------------------------------------

async function findUserByEmail(email) {
  // The admin listUsers API doesn't filter server-side; we page through.
  // For a small test DB this is fine.
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const match = data.users.find((u) => u.email === email);
    if (match) return match;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser() {
  const existing = await findUserByEmail(TEST_USER2_EMAIL);
  if (existing) {
    console.log("user already exists:", existing.id);
    return existing;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_USER2_EMAIL,
    password: TEST_USER2_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Test User 2" },
  });
  if (error) throw error;
  console.log("created user:", data.user.id);
  return data.user;
}

// ---------------------------------------------------------------------------
// 2. Find the primary test user's family circle
// ---------------------------------------------------------------------------

async function findPrimaryCircleId() {
  const primary = await findUserByEmail(TEST_USER_EMAIL);
  if (!primary) {
    throw new Error(`Primary test user not found: ${TEST_USER_EMAIL}`);
  }
  const { data, error } = await supabase
    .from("family_memberships")
    .select("family_circle_id")
    .eq("user_id", primary.id)
    .eq("status", "active")
    .limit(1);
  if (error) throw error;
  if (!data?.length) {
    throw new Error("Primary test user has no active circle membership");
  }
  return data[0].family_circle_id;
}

// ---------------------------------------------------------------------------
// 3. Ensure active membership for user2 in that circle
// ---------------------------------------------------------------------------

async function ensureMembership(userId, circleId) {
  const { data: existing, error: selErr } = await supabase
    .from("family_memberships")
    .select("id, status, display_name")
    .eq("user_id", userId)
    .eq("family_circle_id", circleId)
    .limit(1);
  if (selErr) throw selErr;

  if (existing?.length) {
    const row = existing[0];
    if (row.status !== "active") {
      const { error: updErr } = await supabase
        .from("family_memberships")
        .update({ status: "active" })
        .eq("id", row.id);
      if (updErr) throw updErr;
      console.log("flipped existing membership to active:", row.id);
    } else {
      console.log("membership already active:", row.id);
    }
    return row.id;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("family_memberships")
    .insert({
      family_circle_id: circleId,
      user_id: userId,
      display_name: "Test User 2",
      status: "active",
      role: "member",
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  console.log("inserted membership:", inserted.id);
  return inserted.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const user = await ensureUser();
const circleId = await findPrimaryCircleId();
const membershipId = await ensureMembership(user.id, circleId);

console.log(JSON.stringify({
  userId: user.id,
  email: TEST_USER2_EMAIL,
  circleId,
  membershipId,
}, null, 2));
