import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms — Kynfowk",
  description: "The agreement between you and Kynfowk for using the service.",
};

const LAST_UPDATED = "May 2, 2026";

/**
 * NOTE: Operational draft copy reflecting how Kynfowk works today.
 * Review with counsel before treating as the canonical legal document.
 */
export default function TermsPage() {
  return (
    <main className="page-shell legal-page">
      <article className="container stack-lg">
        <header>
          <h1>Terms of Service</h1>
          <p className="meta">Last updated: {LAST_UPDATED}</p>
        </header>

        <section className="stack-md">
          <p>
            These terms govern your use of Kynfowk. By creating an account or
            using the service you agree to them. If you don’t agree, don’t use
            the service.
          </p>
          <p>
            See our <a href="/privacy">Privacy Policy</a> for how we handle
            your information.
          </p>
        </section>

        <section className="stack-md">
          <h2>1. Who can use Kynfowk</h2>
          <p>
            You must be at least 13 years old to create an account, or have
            an adult Family Circle owner manage a profile on your behalf.
            You’re responsible for keeping your password secure and for
            activity under your account.
          </p>
        </section>

        <section className="stack-md">
          <h2>2. Family Circles</h2>
          <ul>
            <li>
              The person who creates a Family Circle is its <strong>owner</strong>. The owner can invite, remove, and update members.
            </li>
            <li>
              <strong>Members</strong> can edit their own profile, share availability, attend calls, and post within the circle.
            </li>
            <li>
              When you invite someone to a circle, you’re confirming you have a relationship with them and that contacting them through Kynfowk is appropriate.
            </li>
          </ul>
        </section>

        <section className="stack-md">
          <h2>3. Acceptable use</h2>
          <p>Don’t use Kynfowk to:</p>
          <ul>
            <li>Impersonate someone else.</li>
            <li>Harass, threaten, or stalk anyone — inside your circle or outside it.</li>
            <li>Upload illegal content, sexual content involving minors, or content you don’t have rights to share.</li>
            <li>Disrupt the service (scraping, automated abuse, attacks on infrastructure).</li>
            <li>
              Game the Connection Score, rewards pool, or referral system. We log unusual patterns and reserve the right to disqualify accounts that try to inflate metrics through fake calls, fake members, or sock-puppet circles.
            </li>
          </ul>
        </section>

        <section className="stack-md">
          <h2>4. Your content</h2>
          <p>
            You keep ownership of the photos, prompts, recap notes, and
            messages you create. By uploading them you grant Kynfowk a
            limited license to display them inside your Family Circle and to
            store them on our service providers’ infrastructure for as long
            as your account is active.
          </p>
          <p>
            We don’t sell your content, and we don’t show your content to
            anyone outside your Family Circle without your permission.
          </p>
        </section>

        <section className="stack-md">
          <h2>5. Ads and the free tier</h2>
          <p>
            The free tier is supported by ads. We work with Google AdSense
            and may add other networks over time. Ads never run during an
            active family call. Upgrading to a paid plan removes ads.
          </p>
        </section>

        <section className="stack-md">
          <h2>6. Subscriptions and billing (when available)</h2>
          <p>
            When the paid Kynfowk Plus plan launches, billing is processed
            through Square. Subscriptions auto-renew monthly and you can
            cancel anytime from <a href="/settings">Settings</a>; cancellation
            takes effect at the end of the current billing period. We don’t
            offer prorated refunds for partial months unless required by law.
          </p>
        </section>

        <section className="stack-md">
          <h2>7. Rewards</h2>
          <p>
            Kynfowk’s rewards pool, Connection Score, and any cash payouts
            via Tremendous are discretionary programs. Eligibility, amounts,
            and rules can change. We may pause payouts if we suspect fraud
            or abuse, and we may require additional identity verification
            before processing larger payouts.
          </p>
        </section>

        <section className="stack-md">
          <h2>8. Termination</h2>
          <ul>
            <li>You can delete your account at any time. Email <a href="mailto:privacy@kynfowk.com">privacy@kynfowk.com</a> to request deletion.</li>
            <li>We can suspend or terminate accounts that violate these terms.</li>
            <li>If a Family Circle owner deletes their account, the owner role transfers to the next-eligible member where possible; otherwise the circle is closed.</li>
          </ul>
        </section>

        <section className="stack-md">
          <h2>9. Disclaimers</h2>
          <p>
            Kynfowk is provided &ldquo;as is&rdquo; without warranty of any
            kind. We work hard to keep the service running, but we don’t
            guarantee uninterrupted availability or that scheduling
            suggestions will always be perfect.
          </p>
        </section>

        <section className="stack-md">
          <h2>10. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Kynfowk’s total liability
            for any claim arising from your use of the service is limited to
            the amount you paid us in the twelve months preceding the claim,
            or one hundred United States dollars, whichever is greater.
          </p>
        </section>

        <section className="stack-md">
          <h2>11. Governing law</h2>
          <p>
            These terms are governed by the laws of the United States and
            the state in which Kynfowk is incorporated, without regard to
            conflict-of-laws principles.
          </p>
        </section>

        <section className="stack-md">
          <h2>12. Changes to these terms</h2>
          <p>
            We may update these terms from time to time. Material changes
            will be announced by email and reflected in the &ldquo;Last
            updated&rdquo; date above. Continued use of Kynfowk after a
            change means you accept the updated terms.
          </p>
        </section>

        <section className="stack-md">
          <h2>13. Contact</h2>
          <p>
            Questions about these terms? Email{" "}
            <a href="mailto:hello@kynfowk.com">hello@kynfowk.com</a> or send a
            note through <a href="/feedback">the Feedback form</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
