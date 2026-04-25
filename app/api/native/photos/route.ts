import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { getViewerFamilyCircleWith } from "@/lib/data";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family) {
      return Response.json({ error: "Not part of a family circle" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("circle_carousel_photos")
      .select(
        "id, photo_url, caption, membership_id, created_at, family_memberships(display_name, avatar_url)"
      )
      .eq("family_circle_id", family.circle.id)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    const photos = (data ?? []).map((row) => {
      const mem = row.family_memberships as
        | { display_name: string; avatar_url: string | null }[]
        | { display_name: string; avatar_url: string | null }
        | null;
      const record = Array.isArray(mem) ? mem[0] : mem;
      return {
        id: row.id,
        photoUrl: row.photo_url,
        caption: row.caption,
        membershipId: row.membership_id,
        displayName: record?.display_name ?? "Family member",
        avatarUrl: record?.avatar_url ?? null,
        createdAt: row.created_at,
      };
    });

    return Response.json({
      circle: family.circle,
      viewerMembershipId: family.membership.id,
      photos,
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}

type Body = { photoUrl?: string; caption?: string };

export async function POST(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    const body = (await request.json().catch(() => ({}))) as Body;

    const family = await getViewerFamilyCircleWith(supabase, user.id);
    if (!family || family.membership.status !== "active") {
      return Response.json(
        { error: "Only active family members can add photos." },
        { status: 403 }
      );
    }

    const photoUrl = (body.photoUrl ?? "").trim();
    if (!photoUrl) {
      return Response.json({ error: "Missing photo URL." }, { status: 400 });
    }

    const insert = await supabase
      .from("circle_carousel_photos")
      .insert({
        family_circle_id: family.circle.id,
        membership_id: family.membership.id,
        photo_url: photoUrl,
        caption: (body.caption ?? "").trim() || null,
      })
      .select("id")
      .single();
    if (insert.error || !insert.data) {
      return Response.json(
        { error: insert.error?.message ?? "Couldn't save photo." },
        { status: 400 }
      );
    }

    return Response.json({ success: true, photoId: insert.data.id });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
