/**
 * M44 — Give Time placeholder.
 *
 * v1: visible card on the family page that introduces the upcoming
 * Community Roots feature (calling seniors in care facilities).
 * Button is disabled and labeled "Coming soon" — partner API for
 * care-facility matching is TBD per the handoff doc.
 *
 * When the partner integration ships in v2, this card becomes the
 * launch surface for picking a facility + initiating the call. The
 * Strength Score input table (M44) already has the Community Roots
 * row marked Coming Soon — the two surfaces flip live together.
 */
export function GiveTimePlaceholderCard() {
  return (
    <section className="give-time-card" aria-labelledby="give-time-heading">
      <p className="give-time-eyebrow">Coming soon · Earns the most points</p>
      <h3 id="give-time-heading" className="give-time-headline">
        Give Time
      </h3>
      <p className="give-time-body">
        Calls to seniors in nursing homes and care facilities count toward
        Community Roots — a high-weight Strength Score input. We&apos;re partnering
        with care facilities to match families with seniors who&apos;d love a
        regular call. Launches in the next release.
      </p>
      <button className="give-time-button" type="button" disabled>
        Coming soon · v2
      </button>
    </section>
  );
}
