import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendFamilyInviteEmail } from "@/lib/branded-email";

type Body = {
  email?: string;
  displayName?: string;
  circleName?: string;
};

/**
 * Diagnostic endpoint — fires the full invite-email pipeline against
 * a test address and returns every intermediate result as JSON so you
 * can see exactly where it's breaking. Lives in the super-admin
 * toolkit; safe to leave in production since it's gated by
 * requireSuperAdmin and produces real (albeit test) sends.
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);

    const body = (await request.json().catch(() => ({}))) as Body;
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email) {
      return Response.json({ error: "email required" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kynfowk.com";
    const acceptUrl = new URL(`${siteUrl}/auth/accept-invite`);
    acceptUrl.searchParams.set("circle", body.circleName ?? "Test Family");
    acceptUrl.searchParams.set("from", "Diagnostic test");
    acceptUrl.searchParams.set("email", email);

    // Capture the raw generateLink response so we can see Supabase's
    // exact error message. The wrapper in lib/branded-email.ts
    // converts errors into a status field, which can hide the root
    // cause (e.g. project-level "disable signups" setting).
    const rawInvite = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { full_name: body.displayName ?? "Test User" },
        redirectTo: acceptUrl.toString(),
      },
    });

    const result = await sendFamilyInviteEmail({
      email,
      displayName: body.displayName ?? "Test User",
      inviterName: "Diagnostic test",
      circleName: body.circleName ?? "Test Family",
      relationshipLabel: null,
      acceptUrlBase: acceptUrl.toString(),
      adminClient: admin,
    });

    return Response.json({
      sentTo: email,
      env: {
        RESEND_API_KEY_set: Boolean(process.env.RESEND_API_KEY),
        NOTIFICATION_FROM_EMAIL: process.env.NOTIFICATION_FROM_EMAIL ?? null,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      },
      rawSupabaseGenerateLink: {
        // Don't echo the actual action_link (it lets anyone log in as
        // this user). Just status flags so we can confirm whether
        // Supabase even produced a link.
        hasActionLink: Boolean(
          rawInvite.data?.properties?.action_link
        ),
        error: rawInvite.error
          ? { message: rawInvite.error.message }
          : null,
      },
      brandedSendResult: result,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
