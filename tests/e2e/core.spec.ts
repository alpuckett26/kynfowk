import { test, expect } from "@playwright/test";

// All tests in this file reuse the signed-in session from auth.setup.ts

test.describe("Dashboard", () => {
  test("loads with family circle name and stats", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Keep your family rhythm in view/i })).toBeVisible();
    // Family circle readiness card
    await expect(page.getByText(/Family Circle readiness/i)).toBeVisible();
    await expect(page.getByText(/% ready/i)).toBeVisible();
    // Stats grid exists
    await expect(page.getByText(/upcoming calls|completed calls/i).first()).toBeVisible();
  });

  test("shows best times section or empty state", async ({ page }) => {
    await page.goto("/dashboard");
    // Either suggestions or an empty/onboarding nudge should render
    const hasSuggestions = await page.getByText(/Best times to connect/i).isVisible().catch(() => false);
    const hasEmptyState = await page.getByText(/No overlap|Add availability|no shared windows/i).isVisible().catch(() => false);
    expect(hasSuggestions || hasEmptyState).toBe(true);
  });
});

test.describe("Availability", () => {
  test("loads with the availability grid", async ({ page }) => {
    await page.goto("/availability");
    await expect(page.getByRole("heading", { name: /Keep your availability easy to trust/i })).toBeVisible();
    await expect(page.getByText(/Your current rhythm/i)).toBeVisible();
  });

  test("shows day labels in the grid", async ({ page }) => {
    await page.goto("/availability");
    for (const day of ["Mon", "Tue", "Wed", "Thu", "Fri"]) {
      await expect(page.getByText(day).first()).toBeVisible();
    }
  });
});

test.describe("Notifications", () => {
  test("loads the notification inbox", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page.getByRole("heading", { name: /Notifications/i })).toBeVisible();
  });
});

test.describe("Family", () => {
  test("loads the family management page", async ({ page }) => {
    await page.goto("/family");
    await expect(page.getByRole("heading", { name: /Your Family Circle/i })).toBeVisible();
  });

  test("shows at least the current user as a member", async ({ page }) => {
    await page.goto("/family");
    // There should be at least one member row
    await expect(page.getByText(/active|owner/i).first()).toBeVisible();
  });
});

test.describe("Settings", () => {
  test("loads with profile fields", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: /Keep the details behind the rhythm trustworthy/i })).toBeVisible();
    await expect(page.getByLabel(/Full name/i)).toBeVisible();
    await expect(page.getByLabel(/Timezone/i)).toBeVisible();
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
    // Use a fresh context with no saved auth cookies
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto("https://kynfowk.vercel.app/dashboard");
    // Allow time for the server-side redirect to complete
    await page.waitForURL(/sign-in|sign-up|dashboard/, { timeout: 10000 });
    await expect(page).toHaveURL(/sign-in|sign-up/);
    await context.close();
  });
});

test.describe("Navigation", () => {
  test("sign-out link is reachable from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Look for a sign-out button or link anywhere on the page
    const signOut = page.getByRole("button", { name: /sign out/i })
      .or(page.getByRole("link", { name: /sign out/i }));
    await expect(signOut).toBeVisible();
  });
});
