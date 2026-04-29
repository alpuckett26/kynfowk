import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { logAdminAction, requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Body = {
  email?: string;
  /** Optional — release only within this circle. Default: all circles. */
  circleId?: string;
  /** Also delete the unconfirmed Supabase Auth user. Default: true. */
  deleteAuthUser?: boolean;
};

/**
 * Release an email so it can be re-invited. Used when a test invite
 * went out, the recipient never confirmed, and you want to reuse the
 * address (often an `+alias@gmail.com` plus-tagged test address).
 *
 * Deletes:
 *   - public.family_memberships rows with invite_email = X (status = invited)
 *   - auth.users row with email = X (only if email_confirmed_at IS NULL,
 *     so we never nuke a real signed-up user)
 *
 * Active memberships (status = active) are never touched — those belong
 * to a real signed-in user and deleting them would remove their access.
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

    // Pending memberships only — never touch active ones.
    let membershipQuery = admin
      .from("family_memberships")
      .delete()
      .eq("invite_email", email)
      .eq("status", "invited");
    if (body.circleId) {
      membershipQuery = membershipQuery.eq("family_circle_id", body.circleId);
    }
    const memDelete = await membershipQuery.select("id, family_circle_id");
    if (memDelete.error) {
      return Response.json(
        { error: memDelete.error.message },
        { status: 500 }
      );
    }
    const membershipsRemoved = (memDelete.data ?? []).length;

    // Delete the unconfirmed Supabase Auth user if asked. We use the
    // admin auth API which handles cascades cleanly. Only nuke users
    // whose email_confirmed_at is null — i.e. they never accepted.
    let authUserDeleted = false;
    let authUserSkippedReason: string | null = null;
    if (body.deleteAuthUser !== false) {
      const list = await admin.auth.admin.listUsers();
      const target = list.data?.users?.find(
        (u) => (u.email ?? "").toLowerCase() === email
      );
      if (target) {
        if (!target.email_confirmed_at) {
          const del = await admin.auth.admin.deleteUser(target.id);
          if (del.error) {
            authUserSkippedReason = del.error.message;
          } else {
            authUserDeleted = true;
          }
        } else {
          authUserSkippedReason =
            "User already confirmed their email — refusing to delete a real account.";
        }
      } else {
        authUserSkippedReason = "No auth.users row for this email.";
      }
    }

    await logAdminAction(admin, {
      actorUserId: user.id,
      kind: "release_email",
      payload: {
        email,
        circleId: body.circleId ?? null,
        membershipsRemoved,
        authUserDeleted,
        authUserSkippedReason,
      },
    });

    return Response.json({
      success: true,
      email,
      membershipsRemoved,
      authUserDeleted,
      authUserSkippedReason,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
