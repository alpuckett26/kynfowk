import type { Route } from "next";
import Link from "next/link";

import { AdSenseUnit } from "@/components/adsense-unit";
import { type AdPlacement, getAdSenseClientId, getAdSenseSlotId } from "@/lib/ads";
import { getViewerBilling } from "@/lib/billing";

/**
 * M44 — paid-tier gated ad surface.
 * M54 — switches between real AdSense ad unit (when env vars are
 *       configured) and the neutral "Sponsored" placeholder.
 *
 * Server component. Always render this inside an authenticated surface
 * where requireViewer() has already run; pass the viewer's user id.
 *
 * Behavior:
 *   - Paid tier: returns null (no slot, no layout reservation).
 *   - Free tier + AdSense client ID and per-placement slot ID set:
 *     renders the live `<ins class="adsbygoogle">` unit via the
 *     AdSenseUnit client component.
 *   - Free tier but missing AdSense config: renders the "Sponsored"
 *     placeholder card so layout stays stable and the upgrade prompt
 *     is still visible.
 *
 * `placement` keys into lib/ads.ts to find the matching slot ID.
 * `size` reserves a layout-stable height regardless of which branch
 * renders.
 */
export async function AdSlot({
  userId,
  placement,
  size = "leaderboard",
}: {
  userId: string;
  placement: AdPlacement;
  size?: "leaderboard" | "rectangle" | "skyscraper";
}) {
  const billing = await getViewerBilling(userId);
  if (billing.isPaidTier) {
    return null;
  }

  const clientId = getAdSenseClientId();
  const slotId = getAdSenseSlotId(placement);

  if (clientId && slotId) {
    return (
      <AdSenseUnit
        client={clientId}
        slot={slotId}
        placement={placement}
        size={size}
      />
    );
  }

  return (
    <aside
      aria-label="Sponsored placement"
      className={`ad-slot ad-slot-${size}`}
      data-placement={placement}
    >
      <span className="ad-slot-eyebrow">Sponsored</span>
      <p className="ad-slot-body">
        Ad-supported plan.{" "}
        <Link href={"/upgrade" as Route} className="ad-slot-upgrade-link">
          Upgrade to Kynfowk Plus
        </Link>{" "}
        to remove ads and unlock rewarded earnings.
      </p>
    </aside>
  );
}
