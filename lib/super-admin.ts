/**
 * M29 — super-admin gate + audit log helpers.
 *
 * Every /api/admin/* route handler runs `authenticateNativeRequest` to
 * verify the bearer token, then `requireSuperAdmin` to confirm the
 * profile flag, then optionally writes an audit row via
 * `logAdminAction`. Audit failures never block the action — the action
 * itself is the source of truth and an admin shouldn't be locked out
 * because the log table is unavailable.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { NativeAuthError } from "@/lib/native-auth";

export async function requireSuperAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw new NativeAuthError(error.message, 500);
  }
  if (!data || !(data as { is_super_admin: boolean }).is_super_admin) {
    throw new NativeAuthError("Super admin only", 403);
  }
}

export interface AuditLogArgs {
  actorUserId: string;
  kind: string;
  targetUserId?: string | null;
  targetCircleId?: string | null;
  payload?: Record<string, unknown> | null;
}

export async function logAdminAction(
  supabase: SupabaseClient,
  args: AuditLogArgs
): Promise<void> {
  try {
    await supabase.from("admin_audit_log").insert({
      actor_user_id: args.actorUserId,
      action_kind: args.kind,
      target_user_id: args.targetUserId ?? null,
      target_circle_id: args.targetCircleId ?? null,
      payload: args.payload ?? null,
    });
  } catch (error) {
    console.error("[admin-audit] write failed", args.kind, error);
  }
}
