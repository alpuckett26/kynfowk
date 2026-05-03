/**
 * /ads.txt — IAB Authorized Digital Sellers file.
 *
 * Google AdSense reads this at the site root to verify which sellers
 * are authorized to monetize the domain. Without it, AdSense will
 * still serve ads but logs a warning in the dashboard and the account
 * may be flagged.
 *
 * Driven by NEXT_PUBLIC_ADSENSE_CLIENT_ID. AdSense displays the same
 * publisher ID in two slightly different forms:
 *   - In the snippet: `ca-pub-XXXXXXXXXXXXXXXX`
 *   - In Account settings: `pub-XXXXXXXXXXXXXXXX`
 * Either form is accepted here — we normalize to the `pub-…` form
 * that ads.txt expects.
 *
 * f08c47fec0942fa0 is Google's seller ID — public constant.
 *
 * If the env var isn't set yet (pre-AdSense-approval), we serve a
 * harmless comment so requests don't 404.
 */

export const dynamic = "force-dynamic";

export function GET() {
  const raw = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "").trim();
  const headers = { "Content-Type": "text/plain; charset=utf-8" };

  // Accept either "ca-pub-XXX" or "pub-XXX". Normalize to "pub-XXX".
  const pubId = raw.startsWith("ca-pub-")
    ? raw.slice(3)
    : raw.startsWith("pub-")
      ? raw
      : null;

  if (!pubId) {
    return new Response(
      "# Kynfowk — AdSense not yet configured.\n",
      { status: 200, headers }
    );
  }

  return new Response(
    `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`,
    { status: 200, headers }
  );
}
