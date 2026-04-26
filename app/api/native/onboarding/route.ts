import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { trackProductEvent } from "@/lib/product-insights";

type Body = {
  fullName?: string;
  circleName?: string;
  description?: string;
  timezone?: string;
};

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const fullName = (body.fullName ?? "").trim();
    const circleName = (body.circleName ?? "").trim();
    const description = (body.description ?? "").trim();
    const timezone = (body.timezone ?? "America/Chicago").trim();
    if (!fullName || !circleName) {
      return Response.json(
        { error: "Your name and a circle name are required." },
        { status: 400 }
      );
    }

    const existingMembership = await supabase
      .from("family_memberships")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (existingMembership.data) {
      return Response.json(
        { error: "You're already in a family circle." },
        { status: 400 }
      );
    }

    const profileUpsert = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      timezone,
    });
    if (profileUpsert.error) {
      return Response.json({ error: profileUpsert.error.message }, { status: 400 });
    }

    const circleInsert = await supabase
      .from("family_circles")
      .insert({
        name: circleName,
        description: description || null,
        created_by: user.id,
      })
      .select("id, name, description")
      .single();
    if (circleInsert.error || !circleInsert.data) {
      return Response.json(
        { error: circleInsert.error?.message ?? "Couldn't create circle." },
        { status: 400 }
      );
    }

    const membershipInsert = await supabase
      .from("family_memberships")
      .insert({
        family_circle_id: circleInsert.data.id,
        user_id: user.id,
        display_name: fullName,
        invite_email: user.email ?? null,
        status: "active",
        role: "owner",
      })
      .select("id")
      .single();
    if (membershipInsert.error || !membershipInsert.data) {
      return Response.json(
        {
          error:
            membershipInsert.error?.message ?? "Couldn't add you as the owner.",
        },
        { status: 400 }
      );
    }

    await supabase.from("family_activity").insert({
      family_circle_id: circleInsert.data.id,
      actor_membership_id: membershipInsert.data.id,
      activity_type: "circle_created",
      summary: `${fullName} created the ${circleName} family circle.`,
    });

    await trackProductEvent(supabase, {
      eventName: "family_circle_created",
      userId: user.id,
      familyCircleId: circleInsert.data.id,
    });

    return Response.json({
      success: true,
      circle: circleInsert.data,
      membershipId: membershipInsert.data.id,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
