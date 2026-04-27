import {
  authenticateNativeRequest,
  nativeErrorResponse,
} from "@/lib/native-auth";
import { requireSuperAdmin } from "@/lib/super-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { user, supabase } = await authenticateNativeRequest(request);
    await requireSuperAdmin(supabase, user.id);
    const admin = createSupabaseAdminClient();

    const circlesResponse = await admin
      .from("family_circles")
      .select("id, name, description, created_at, created_by")
      .order("created_at", { ascending: false });
    const circles = (circlesResponse.data ?? []) as Array<{
      id: string;
      name: string;
      description: string | null;
      created_at: string;
      created_by: string | null;
    }>;

    if (circles.length === 0) {
      return Response.json({ circles: [] });
    }

    const ownerIds = Array.from(
      new Set(circles.map((c) => c.created_by).filter(Boolean) as string[])
    );
    const ownerProfiles = ownerIds.length
      ? (
          await admin
            .from("profiles")
            .select("id, email, full_name")
            .in("id", ownerIds)
        ).data ?? []
      : [];
    const ownerById = new Map(
      (ownerProfiles as { id: string; email: string | null; full_name: string | null }[]).map(
        (p) => [p.id, p]
      )
    );

    const memberCounts = await admin
      .from("family_memberships")
      .select("family_circle_id")
      .in(
        "family_circle_id",
        circles.map((c) => c.id)
      )
      .eq("status", "active");
    const memberByCircle = new Map<string, number>();
    for (const row of (memberCounts.data ?? []) as { family_circle_id: string }[]) {
      memberByCircle.set(
        row.family_circle_id,
        (memberByCircle.get(row.family_circle_id) ?? 0) + 1
      );
    }

    const lastActivity = await admin
      .from("family_activity")
      .select("family_circle_id, created_at")
      .in(
        "family_circle_id",
        circles.map((c) => c.id)
      )
      .order("created_at", { ascending: false })
      .limit(500);
    const lastActivityByCircle = new Map<string, string>();
    for (const row of (lastActivity.data ?? []) as {
      family_circle_id: string;
      created_at: string;
    }[]) {
      if (!lastActivityByCircle.has(row.family_circle_id)) {
        lastActivityByCircle.set(row.family_circle_id, row.created_at);
      }
    }

    return Response.json({
      circles: circles.map((c) => {
        const owner = c.created_by ? ownerById.get(c.created_by) : null;
        return {
          id: c.id,
          name: c.name,
          description: c.description,
          createdAt: c.created_at,
          ownerEmail: owner?.email ?? null,
          ownerName: owner?.full_name ?? null,
          memberCount: memberByCircle.get(c.id) ?? 0,
          lastActivityAt: lastActivityByCircle.get(c.id) ?? null,
        };
      }),
    });
  } catch (error) {
    return nativeErrorResponse(error);
  }
}
