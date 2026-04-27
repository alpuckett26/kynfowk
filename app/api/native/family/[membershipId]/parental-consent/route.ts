import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

type Body = { enabled?: boolean };

export async function POST(
  request: Request,
  context: { params: Promise<{ membershipId: string }> }
) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const { membershipId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Body;

    if (typeof body.enabled !== "boolean") {
      return Response.json(
        { error: "enabled boolean required." },
        { status: 400 }
      );
    }

    // Find the minor + the managing parent.
    const minorResponse = await supabase
      .from("family_memberships")
      .select("id, is_minor, managed_by_membership_id")
      .eq("id", membershipId)
      .maybeSingle();
    const minor = minorResponse.data as
      | {
          id: string;
          is_minor: boolean;
          managed_by_membership_id: string | null;
        }
      | null;
    if (!minor) {
      return Response.json({ error: "Member not found." }, { status: 404 });
    }
    if (!minor.is_minor) {
      return Response.json(
        { error: "Parental consent only applies to minors." },
        { status: 400 }
      );
    }
    if (!minor.managed_by_membership_id) {
      return Response.json(
        { error: "Minor has no managing parent set." },
        { status: 400 }
      );
    }

    const parentResponse = await supabase
      .from("family_memberships")
      .select("user_id")
      .eq("id", minor.managed_by_membership_id)
      .maybeSingle();
    const parentUserId = (
      parentResponse.data as { user_id: string | null } | null
    )?.user_id;
    if (parentUserId !== user.id) {
      return Response.json(
        { error: "Only the managing parent can change this setting." },
        { status: 403 }
      );
    }

    const updateResponse = await supabase
      .from("family_memberships")
      .update({ parental_auto_schedule_consent: body.enabled })
      .eq("id", membershipId);
    if (updateResponse.error) {
      return Response.json(
        { error: updateResponse.error.message },
        { status: 400 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
