import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("sign in as test user", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.test"
    );
  }

  await page.goto("/auth/sign-in");
  await expect(page.getByRole("heading", { name: /Open your Family Circle dashboard/i })).toBeVisible();

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /Open dashboard/i }).click();

  // Should land on dashboard after sign-in
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await expect(page.getByRole("heading", { name: /Keep your family rhythm in view/i })).toBeVisible();

  // Save auth cookies for all other tests
  await page.context().storageState({ path: authFile });
});
