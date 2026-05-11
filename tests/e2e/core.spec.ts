import { test, expect } from "@playwright/test";

// All tests in this file reuse the signed-in session from auth.setup.ts.
// Post-M50 the home is a horizontal swipe shell: Connect / Plan / Earn /
// Family panels. /availability and /family are now redirects to the
// Plan and Family panels respectively. Tests assert on stable behaviours
// (URLs, action buttons, redirect contracts) rather than marketing copy.

test.describe("Dashboard — Connect panel", () => {
  test("loads with greeting + readiness meta", async ({ page }) => {
    await page.goto("/dashboard");
    // Greeting h1 includes the user's first name; assert just the shape.
    await expect(page.getByRole("heading", { level: 1, name: /Hey .+ — what's next\?/i })).toBeVisible();
    // Readiness meta line — present whether or not there's an active call.
    await expect(page.getByText(/% ready/i).first()).toBeVisible();
  });

  test("shows Ring now and Schedule cards", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /^Ring now$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Schedule$/ })).toBeVisible();
  });
});

test.describe("M50 redirects", () => {
  test("/availability redirects to /dashboard#plan", async ({ page }) => {
    await page.goto("/availability");
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/dashboard(#plan)?$/);
  });

  test("/family redirects to /dashboard#family", async ({ page }) => {
    await page.goto("/family");
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    expect(page.url()).toMatch(/\/dashboard(#family)?$/);
  });
});

test.describe("Notifications", () => {
  test("loads the notification inbox", async ({ page }) => {
    await page.goto("/notifications");
    // Post-M50 the heading is "Updates", not "Notifications".
    await expect(page.getByRole("heading", { name: /^Updates$/ })).toBeVisible();
  });
});

test.describe("Settings", () => {
  test("loads with profile fields", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { level: 1, name: /^Settings$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Profile and timing/i })).toBeVisible();
  });
});

test.describe("Getting started", () => {
  test("loads the guide page", async ({ page }) => {
    await page.goto("/getting-started");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("Auth redirects", () => {
  test("unauthenticated visit to dashboard redirects to sign-in", async ({ browser }) => {
    const baseURL = process.env.BASE_URL ?? "https://kynfowk.com";
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForURL(/sign-in|sign-up/, { timeout: 10000 });
    await expect(page).toHaveURL(/sign-in|sign-up/);
    await context.close();
  });
});

test.describe("Navigation", () => {
  test("sign-out is reachable via the header kebab menu", async ({ page }) => {
    // Use /notifications instead of /dashboard — the dashboard auto-pops
    // the Family Poll dialog which intercepts header clicks. Inside the
    // kebab the Sign-out button has role="menuitem" (not button).
    await page.goto("/notifications");
    await page.getByRole("button", { name: /^More$/i }).click();
    await expect(page.getByRole("menuitem", { name: /sign out/i })).toBeVisible();
  });
});
