import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env.test")) {
  loadEnvFile(".env.test");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "https://kynfowk.com",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/
    },
    {
      name: "e2e",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/user.json"
      },
      dependencies: ["setup"]
    }
  ]
});
