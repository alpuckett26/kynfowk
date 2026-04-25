import { Resend } from "resend";

/**
 * Resend config. Three env vars, all server-side:
 *   RESEND_API_KEY      — from resend.com/api-keys
 *   RESEND_FROM_EMAIL   — verified-domain address, e.g. "hello@kynfowk.com".
 *                         Falls back to "onboarding@resend.dev" which only
 *                         delivers to the Resend account owner's email —
 *                         fine for dev, not production.
 *   NEXT_PUBLIC_SITE_URL — used to build absolute join URLs in emails.
 */
function getConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Kynfowk <onboarding@resend.dev>";
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kynfowk.com";
  return { apiKey, from, siteUrl };
}

export function isEmailConfigured(): boolean {
  return getConfig() !== null;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date} at ${time}`;
}

function renderInviteEmail({
  callTitle,
  scheduledAt,
  familyName,
  inviterName,
  joinUrl,
}: {
  callTitle: string;
  scheduledAt: string;
  familyName: string;
  inviterName: string;
  joinUrl: string;
}): { subject: string; html: string; text: string } {
  const when = formatWhen(scheduledAt);
  const subject = `${inviterName} invited you to a ${familyName} family call`;
  const text = [
    `${inviterName} scheduled "${callTitle}" for the ${familyName} family.`,
    ``,
    `When: ${when}`,
    ``,
    `Join the call: ${joinUrl}`,
    ``,
    `— Kynfowk`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border:1px solid #f3f4f6;border-radius:16px;padding:32px;">
        <tr><td>
          <p style="margin:0;font-size:32px;text-align:center;">💜</p>
          <h1 style="margin:16px 0 4px;font-size:22px;font-weight:700;text-align:center;">
            ${escapeHtml(inviterName)} invited you to a call
          </h1>
          <p style="margin:0;font-size:14px;color:#6b7280;text-align:center;">
            ${escapeHtml(familyName)} family
          </p>

          <div style="margin:24px 0;padding:20px;border-radius:12px;background:#faf5ff;border:1px solid #e9d5ff;">
            <p style="margin:0;font-size:18px;font-weight:600;color:#6b21a8;">
              ${escapeHtml(callTitle)}
            </p>
            <p style="margin:6px 0 0;font-size:14px;color:#7c3aed;">
              ${escapeHtml(when)}
            </p>
          </div>

          <div style="text-align:center;margin:24px 0 8px;">
            <a href="${joinUrl}" style="display:inline-block;padding:12px 28px;border-radius:999px;background:linear-gradient(135deg,#d946ef 0%,#9333ea 100%);color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">
              Join the call
            </a>
          </div>

          <p style="margin:32px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
            Kynfowk — keep your family close.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

/** Minimal HTML escape for user-supplied text in the template. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Send a call-invitation email to each of `toEmails`. Returns the count
 * of successfully sent messages. Errors per-recipient are swallowed —
 * one failed send shouldn't block the rest, and the call itself is
 * already scheduled in the DB regardless of email delivery.
 *
 * When Resend isn't configured, this is a no-op that resolves 0 so
 * callers don't need to branch.
 */
export async function sendCallInvites({
  toEmails,
  callId,
  callTitle,
  scheduledAt,
  familyName,
  inviterName,
}: {
  toEmails: string[];
  callId: string;
  callTitle: string;
  scheduledAt: string;
  familyName: string;
  inviterName: string;
}): Promise<number> {
  const cfg = getConfig();
  if (!cfg || toEmails.length === 0) return 0;

  const joinUrl = `${cfg.siteUrl}/call/${callId}`;
  const { subject, html, text } = renderInviteEmail({
    callTitle,
    scheduledAt,
    familyName,
    inviterName,
    joinUrl,
  });

  const resend = new Resend(cfg.apiKey);

  const results = await Promise.allSettled(
    toEmails.map((to) =>
      resend.emails.send({
        from: cfg.from,
        to,
        subject,
        html,
        text,
      })
    )
  );

  return results.filter((r) => r.status === "fulfilled").length;
}
