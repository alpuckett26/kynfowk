import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name, timezone")
      .eq("id", user.id)
      .maybeSingle();

    const { data: membership } = await supabase
      .from("family_memberships")
      .select(
        "id, family_circle_id, display_name, role, status, family_circles(name, description)"
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    return Response.json({
      user: {
        id: user.id,
        email: user.email ?? profile?.email ?? null,
        fullName: profile?.full_name ?? null,
        timezone: profile?.timezone ?? null,
      },
      family: membership
        ? {
            membershipId: membership.id,
            familyCircleId: membership.family_circle_id,
            displayName: membership.display_name,
            role: membership.role,
            circleName:
              (membership.family_circles as unknown as { name?: string } | null)
                ?.name ?? null,
            circleDescription:
              (membership.family_circles as unknown as { description?: string | null } | null)
                ?.description ?? null,
          }
        : null,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
