/**
 * Branded transactional email — used for invites, password resets, and
 * any other one-off email that needs to feel human rather than robotic.
 *
 * Why this exists: Supabase Auth's built-in templates ("Reset Password
 * \n Follow this link to reset the password") are bare and machine-
 * generated, which Gmail aggressively filters to spam — especially
 * from new sender domains. By generating the action link via
 * supabase.auth.admin.generateLink and sending the email ourselves
 * through Resend with proper HTML, we get:
 *   - Family-themed copy that doesn't trip spam heuristics
 *   - A consistent visual identity across every transactional email
 *   - Plain-text fallback for clients that strip HTML
 *   - List-Unsubscribe header so providers see we're well-behaved
 *
 * Sender, reply-to, and brand name are sourced from env so a single
 * domain change doesn't require code edits.
 */

const BRAND_NAME = "Kynfowk";
const BRAND_TAGLINE = "Family connection, one warm call at a time.";
const BRAND_COLOR = "#1f1916";
const BRAND_BG = "#fdf6ec";
const ACCENT_COLOR = "#8a6a3a";

interface BrandedEmailInput {
  to: string;
  subject: string;
  /**
   * Short greeting like "Hi Aaron" or "Hi friend". Rendered as a
   * salutation paragraph. Keep it human.
   */
  greeting?: string;
  /**
   * Body copy as plain paragraphs. Each entry becomes a <p> in HTML
   * and a paragraph in the text fallback.
   */
  paragraphs: string[];
  /**
   * Single call-to-action button. URL must be absolute https://.
   */
  cta?: { label: string; url: string };
  /**
   * Optional postscript / footnote rendered after the CTA in muted
   * text. Useful for "If you didn't request this, ignore this email."
   */
  postscript?: string;
}

interface BrandedEmailResult {
  status: "sent" | "skipped" | "failed";
  errorMessage?: string;
  providerMessageId?: string | null;
}

export async function sendBrandedTransactionalEmail(
  input: BrandedEmailInput
): Promise<BrandedEmailResult> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;
  if (!resendKey || !fromEmail) {
    console.info(
      `[branded-email] Resend not configured — skipping ${input.subject} to ${input.to}`
    );
    return {
      status: "skipped",
      errorMessage: "RESEND_API_KEY or NOTIFICATION_FROM_EMAIL not set.",
    };
  }

  const fromName = process.env.NOTIFICATION_FROM_NAME ?? BRAND_NAME;
  const replyTo = process.env.NOTIFICATION_REPLY_TO ?? fromEmail;
  const unsubscribeUrl =
    process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/notifications`
      : "https://kynfowk.com/notifications";

  const html = renderHtml(input);
  const text = renderText(input);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: [input.to],
      reply_to: replyTo,
      subject: input.subject,
      html,
      text,
      headers: {
        // RFC 8058 — tells Gmail this is a well-behaved bulk sender,
        // suppresses the "report spam" prompt over time.
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error(
      `[branded-email] Resend ${response.status} sending "${input.subject}" to ${input.to}: ${detail}`
    );
    return {
      status: "failed",
      errorMessage: `Resend returned ${response.status}.`,
    };
  }

  const payload = (await response.json().catch(() => ({}))) as { id?: string };
  return {
    status: "sent",
    providerMessageId: payload.id ?? null,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(input: BrandedEmailInput): string {
  const greeting = input.greeting ? `<p>${escapeHtml(input.greeting)}</p>` : "";
  const paragraphs = input.paragraphs
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n        ");
  const cta = input.cta
    ? `
        <p style="text-align:center;margin:32px 0;">
          <a href="${escapeHtml(input.cta.url)}"
             style="background:${BRAND_COLOR};color:${BRAND_BG};padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
            ${escapeHtml(input.cta.label)}
          </a>
        </p>`
    : "";
  const postscript = input.postscript
    ? `<p style="color:#8a7a66;font-size:13px;margin-top:24px;">${escapeHtml(input.postscript)}</p>`
    : "";

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kynfowk.com";
  const markUrl = `${siteUrl}/email-mark.png`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${BRAND_COLOR};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND_BG};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #ecdcc5;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 8px 32px;text-align:center;">
              <a href="${escapeHtml(siteUrl)}" style="text-decoration:none;color:inherit;">
                <img src="${escapeHtml(markUrl)}" alt="Kynfowk" width="56" height="56"
                     style="display:inline-block;border:none;outline:none;" />
                <h1 style="margin:8px 0 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:32px;letter-spacing:-0.5px;color:${BRAND_COLOR};">
                  Kynfowk
                </h1>
                <p style="margin:4px 0 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${ACCENT_COLOR};font-weight:600;">
                  ${BRAND_TAGLINE}
                </p>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px 32px;font-size:15px;line-height:1.55;">
              ${greeting}
              ${paragraphs}
              ${cta}
              ${postscript}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:${BRAND_BG};text-align:center;font-size:12px;color:#8a7a66;border-top:1px solid #ecdcc5;">
              You're receiving this because you have a Kynfowk account.<br />
              <a href="${escapeHtml(siteUrl)}/notifications" style="color:${ACCENT_COLOR};">Manage notifications</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(siteUrl)}" style="color:${ACCENT_COLOR};">kynfowk.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

type AdminClientLike = {
  auth: {
    admin: {
      generateLink: (input: {
        type: "invite" | "magiclink" | "recovery";
        email: string;
        options?: {
          data?: Record<string, unknown>;
          redirectTo?: string;
        };
      }) => Promise<{
        data: { properties?: { action_link?: string | null } | null } | null;
        error: { message: string } | null;
      }>;
    };
  };
};

/**
 * Generate a Supabase invite action_link via the admin API and send it
 * through Resend with a family-themed body. Used by both the web
 * inviteFamilyMemberAction and the native /api/native/family/invite
 * endpoint, replacing supabase.auth.admin.inviteUserByEmail (which
 * routes through Supabase's spammy default template).
 *
 * If the recipient already has an auth.users row (signed up previously
 * for any reason), Supabase rejects generateLink({ type: 'invite' })
 * with a "User already registered" error. In that case we fall back
 * to a magic-link sign-in so they still get an actionable email — the
 * accept-invite page they land on after sign-in claims the pending
 * family_membership the same way (M36 fix runs on every signed-in
 * landing).
 */
export async function sendFamilyInviteEmail(args: {
  email: string;
  displayName: string;
  inviterName: string;
  circleName: string;
  relationshipLabel: string | null;
  /** Pre-built /auth/accept-invite URL with the friendly query params. */
  acceptUrlBase: string;
  adminClient: AdminClientLike;
}): Promise<BrandedEmailResult & { existingUser?: boolean }> {
  let actionLink: string | null = null;
  let existingUser = false;

  const inviteResp = await args.adminClient.auth.admin.generateLink({
    type: "invite",
    email: args.email,
    options: {
      data: {
        full_name: args.displayName,
        family_circle_name: args.circleName,
        inviter_name: args.inviterName,
        relationship_label: args.relationshipLabel ?? undefined,
      },
      redirectTo: args.acceptUrlBase,
    },
  });

  if (!inviteResp.error) {
    actionLink = inviteResp.data?.properties?.action_link ?? null;
  } else {
    const msg = (inviteResp.error.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      existingUser = true;
      const magicResp = await args.adminClient.auth.admin.generateLink({
        type: "magiclink",
        email: args.email,
        options: { redirectTo: args.acceptUrlBase },
      });
      if (magicResp.error) {
        return {
          status: "failed",
          existingUser: true,
          errorMessage: magicResp.error.message,
        };
      }
      actionLink = magicResp.data?.properties?.action_link ?? null;
    } else {
      return { status: "failed", errorMessage: inviteResp.error.message };
    }
  }

  if (!actionLink) {
    return { status: "failed", existingUser, errorMessage: "No action_link returned." };
  }

  const greeting = args.displayName
    ? `Hi ${args.displayName.trim().split(/\s+/)[0]},`
    : "Hi there,";

  const relationshipPhrase = args.relationshipLabel
    ? ` as ${args.relationshipLabel.toLowerCase()}`
    : "";

  // Body shifts slightly for existing-user vs. brand-new invitee:
  // new users see "create your account", existing users see "sign in".
  const ctaLabel = existingUser ? "Open the family circle" : "Accept the invite";
  const paragraphs = existingUser
    ? [
        `${args.inviterName} added you to their Family Circle on Kynfowk${relationshipPhrase}.`,
        "You already have a Kynfowk account, so just tap below to sign in and you'll land in the right circle.",
      ]
    : [
        `${args.inviterName} added you to their Family Circle on Kynfowk${relationshipPhrase} and wants to stay connected.`,
        "Kynfowk helps families share real availability, schedule calls that actually happen, and build a streak of Time Together.",
      ];

  const result = await sendBrandedTransactionalEmail({
    to: args.email,
    subject: `${args.inviterName} invited you to ${args.circleName}`,
    greeting,
    paragraphs,
    cta: { label: ctaLabel, url: actionLink },
    postscript: existingUser
      ? "If you didn't expect this, you can ignore this email — the link expires shortly."
      : "Free for families. No credit card needed. If this came as a surprise, you can ignore this email — nothing happens until you accept.",
  });
  return { ...result, existingUser };
}

function renderText(input: BrandedEmailInput): string {
  const lines: string[] = [];
  lines.push(`KYNFOWK · ${BRAND_TAGLINE}`);
  lines.push("─────────────────────────────");
  lines.push("");
  if (input.greeting) {
    lines.push(input.greeting);
    lines.push("");
  }
  for (const p of input.paragraphs) {
    lines.push(p);
    lines.push("");
  }
  if (input.cta) {
    lines.push(`${input.cta.label}: ${input.cta.url}`);
    lines.push("");
  }
  if (input.postscript) {
    lines.push(input.postscript);
    lines.push("");
  }
  lines.push("─────────────────────────────");
  lines.push("kynfowk.com — manage notifications at /notifications");
  return lines.join("\n");
}
