import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — Kynfowk",
  description:
    "How Kynfowk collects, uses, and protects the information shared inside your Family Circle.",
};

const LAST_UPDATED = "May 2, 2026";

/**
 * NOTE: This is operational draft copy describing what Kynfowk actually
 * does today. Review with counsel before treating it as the
 * canonical legal document.
 */
export default function PrivacyPage() {
  return (
    <main className="page-shell legal-page">
      <article className="container stack-lg">
        <header>
          <h1>Privacy Policy</h1>
          <p className="meta">Last updated: {LAST_UPDATED}</p>
        </header>

        <section className="stack-md">
          <p>
            Kynfowk helps families coordinate calls, share availability, and
            stay connected. To do that, we collect a small amount of
            information about you and the people in your Family Circle. This
            page explains what we collect, what we do with it, and the
            choices you have.
          </p>
          <p>
            We are based in the United States. By using Kynfowk you agree to
            this policy and our <a href="/terms">Terms of Service</a>.
          </p>
        </section>

        <section className="stack-md">
          <h2>1. Information we collect</h2>
          <ul>
            <li>
              <strong>Account information.</strong> Email address, password
              hash, full name, time zone.
            </li>
            <li>
              <strong>Profile data.</strong> Optional details you add yourself
              — birthday, nickname, bio, favorite food, pronouns, hometown,
              avatar photo, faith and prayer notes.
            </li>
            <li>
              <strong>Family Circle data.</strong> The people you add to your
              circle, their relationship to you, their availability, and their
              call participation history.
            </li>
            <li>
              <strong>Call records.</strong> Scheduled times, attendance
              events, recap notes, optional in-call game scores.
            </li>
            <li>
              <strong>Photos and prompts.</strong> Items you upload to the
              family carousel, polls you create, prayer requests you share.
            </li>
            <li>
              <strong>Device data.</strong> Push-notification tokens, browser
              metadata used to deliver session-bound features (e.g. the
              incoming-call modal).
            </li>
            <li>
              <strong>Communications.</strong> Feedback you send through the{" "}
              <a href="/feedback">Feedback</a> form.
            </li>
          </ul>
        </section>

        <section className="stack-md">
          <h2>2. How we use this information</h2>
          <ul>
            <li>Run the Kynfowk service — schedule calls, send invites, sync availability across your circle.</li>
            <li>Send transactional emails — sign-up confirmation, password resets, family invites, missed-call recovery prompts, weekly briefings.</li>
            <li>Personalize the experience — surface members you call most often, remember your time zone, adjust the dashboard to your activity.</li>
            <li>Improve Kynfowk — analyze aggregated usage to find pain points and prioritize fixes. We do not sell your individual data.</li>
          </ul>
        </section>

        <section className="stack-md">
          <h2>3. Who sees your information</h2>
          <ul>
            <li>
              <strong>Other members of your Family Circle</strong> see your
              display name, relationship label, availability, call
              participation, and any photos or prompts you choose to share.
              You control what’s shared from <a href="/settings">Settings</a>.
            </li>
            <li>
              <strong>Service providers</strong> we use to operate Kynfowk:
              <ul>
                <li>Supabase — authentication and database hosting.</li>
                <li>Vercel — application hosting and CDN.</li>
                <li>Resend — transactional email delivery.</li>
                <li>Google Cloud — push-notification delivery via Firebase.</li>
              </ul>
              Each handles only the data needed to provide its service.
            </li>
            <li>
              <strong>Advertising partners.</strong> Free-tier accounts see
              ads served by Google AdSense. AdSense uses cookies to display
              ads that are relevant to you across the web. You can review or
              opt out at{" "}
              <a href="https://adssettings.google.com" rel="noreferrer noopener" target="_blank">
                adssettings.google.com
              </a>
              . Upgrading to a paid Kynfowk plan removes ads entirely.
            </li>
            <li>
              <strong>Legal requests.</strong> We comply with valid legal
              process. We notify you where the law allows.
            </li>
          </ul>
        </section>

        <section className="stack-md">
          <h2>4. Cookies and similar technologies</h2>
          <p>
            We use cookies to keep you signed in and to remember your
            preferences. We use <code>sessionStorage</code> in your browser to
            remember small per-tab values (which dashboard panel you’re on,
            the once-per-session ad pre-roll). Third-party cookies set by
            Google AdSense are subject to AdSense’s own policies and to your
            browser’s cookie controls.
          </p>
          <p>
            If you visit Kynfowk from the European Economic Area, the United
            Kingdom, or Switzerland, AdSense’s consent banner will ask
            permission before personalized ads are shown.
          </p>
        </section>

        <section className="stack-md">
          <h2>5. Your choices</h2>
          <ul>
            <li>
              <strong>Access and correction.</strong> Most personal details
              are editable from <a href="/settings">Settings</a>.
            </li>
            <li>
              <strong>Deletion.</strong> Email <a href="mailto:privacy@kynfowk.com">privacy@kynfowk.com</a> to request deletion of your account. We scrub personal data within 90 days; some records may persist in encrypted backups for a short period beyond that as a normal part of database operations.
            </li>
            <li>
              <strong>Export.</strong> Email the same address for a copy of the data tied to your account.
            </li>
            <li>
              <strong>Notification preferences.</strong> Manage email and push frequency from <a href="/settings">Settings</a> or unsubscribe via the link in any Kynfowk email.
            </li>
          </ul>
        </section>

        <section className="stack-md">
          <h2>6. Children</h2>
          <p>
            Kynfowk accounts are intended for adults aged 13 and over. Adults
            in a Family Circle can create <em>managed profiles</em> for
            children under 13 — those profiles are controlled entirely by the
            adult and don’t have their own login. We don’t knowingly collect
            personal information directly from children under 13, and
            personalized ads are not shown on managed-profile sessions.
          </p>
        </section>

        <section className="stack-md">
          <h2>7. Changes to this policy</h2>
          <p>
            We’ll post any updates here and bump the &ldquo;Last updated&rdquo;
            date above. If a change materially affects how we handle your
            information, we’ll also email you.
          </p>
        </section>

        <section className="stack-md">
          <h2>8. Contact</h2>
          <p>
            Questions about privacy? Email{" "}
            <a href="mailto:privacy@kynfowk.com">privacy@kynfowk.com</a> or
            send a note through <a href="/feedback">the Feedback form</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
