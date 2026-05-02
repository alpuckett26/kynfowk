/**
 * /ads.txt — IAB Authorized Digital Sellers file.
 *
 * Google AdSense reads this at the site root to verify which sellers
 * are authorized to monetize the domain. Without it, AdSense will
 * still serve ads but logs a warning in the dashboard and the account
 * may be flagged.
 *
 * Driven by the same env var the AdSlot uses: NEXT_PUBLIC_ADSENSE_CLIENT_ID.
 * The AdSense client ID format is "ca-pub-XXXXXXXXXXXXXXXX"; the ads.txt
 * line wants the "pub-XXXXXXXXXXXXXXXX" portion.
 *
 * f08c47fec0942fa0 is Google's seller ID — it's a public constant that
 * never changes.
 *
 * If the env var isn't set yet (pre-AdSense-approval), we serve a
 * harmless comment so requests don't 404.
 */

export const dynamic = "force-dynamic";

export function GET() {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const headers = { "Content-Type": "text/plain; charset=utf-8" };

  if (!clientId || !clientId.startsWith("ca-pub-")) {
    return new Response(
      "# Kynfowk — AdSense not yet configured.\n",
      { status: 200, headers }
    );
  }

  const pubId = clientId.replace(/^ca-/, "");
  return new Response(
    `google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`,
    { status: 200, headers }
  );
}
