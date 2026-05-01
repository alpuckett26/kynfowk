import { getViewerBilling } from "@/lib/billing";

/**
 * M44 — paid-tier gated ad slot.
 *
 * v1: server component that returns null for paid-tier viewers and a
 * neutral "Sponsored" placeholder for free-tier viewers. The actual
 * AdSense / AdMob / Meta Audience Network rendering lands in a follow-up
 * PR — this slot just reserves the layout space and proves the gate.
 *
 * Always render this inside an authenticated surface where requireViewer()
 * has already run. Pass `userId` from that viewer.
 *
 * `placement` is a free-form string echoed into the placeholder so the
 * design / ops team can spot which slot they are looking at when ad units
 * are wired up. It is also what the eventual ad-fetch will key off.
 */
export async function AdSlot({
  userId,
  placement,
  size = "leaderboard",
}: {
  userId: string;
  placement: string;
  size?: "leaderboard" | "rectangle" | "skyscraper";
}) {
  const billing = await getViewerBilling(userId);
  if (billing.isPaidTier) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored placement"
      className={`ad-slot ad-slot-${size}`}
      data-placement={placement}
    >
      <span className="ad-slot-eyebrow">Sponsored</span>
      <p className="ad-slot-body">
        Ad-supported plan. Upgrade to Kynfowk Plus to remove ads and unlock
        rewarded earnings.
      </p>
    </aside>
  );
}
