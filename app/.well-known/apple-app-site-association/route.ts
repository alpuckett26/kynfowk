/**
 * Apple App Site Association — published at
 * https://kynfowk.vercel.app/.well-known/apple-app-site-association
 *
 * iOS uses this to verify that this domain is authorized to deep-link
 * into the Kynfowk app. Bundle ID is `com.kynfowk.app`; Team ID is
 * sourced from the APPLE_TEAM_ID env var (set in Vercel).
 *
 * Apple is strict about the response:
 * - Content-Type must be application/json (NOT application/octet-stream)
 * - Must be served over HTTPS with no redirect
 * - Must be readable without auth
 * - Path must be exactly /.well-known/apple-app-site-association
 *
 * The `components` format below tells iOS to route every path EXCEPT
 * /admin, /api/*, /open, /auth/login (web-only flows) into the native
 * app when installed.
 */

import { NextResponse } from "next/server";

const BUNDLE_ID = "com.kynfowk.app";

export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID;
  if (!teamId) {
    // Don't serve a malformed AASA — Apple caches negative results
    // for hours, so a clean 404 is better than placeholder JSON.
    return new NextResponse("Not configured", { status: 404 });
  }

  const body = {
    applinks: {
      details: [
        {
          appIDs: [`${teamId}.${BUNDLE_ID}`],
          components: [
            // Routes that the native app should handle.
            { "/": "/calls/*" },
            { "/": "/dashboard*" },
            { "/": "/family*" },
            { "/": "/notifications*" },
            { "/": "/inbox*" },
            { "/": "/schedule*" },
            { "/": "/photos*" },
            { "/": "/polls*" },
            { "/": "/auth/callback*" },
            // Routes that should stay in the browser.
            { "/": "/admin*", exclude: true },
            { "/": "/api/*", exclude: true },
            { "/": "/open*", exclude: true },
            { "/": "/login*", exclude: true },
            { "/": "/", exclude: true },
          ],
        },
      ],
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
