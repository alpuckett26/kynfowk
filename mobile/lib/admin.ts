import { apiFetch } from "@/lib/api";
import type {
  AdminCircleDetail,
  AdminCirclesResponse,
  AdminOverview,
  AdminUserDetail,
  AdminUsersSearchResponse,
  AuditListResponse,
  AutoScheduleRunResponse,
  ImpersonateStartResponse,
  RecurrenceCronResponse,
  ResetAutoScheduleResponse,
  SpawnFamilyResponse,
  SweepCronResponse,
  TimeTravelResponse,
  WipeFamiliesResponse,
} from "@/types/admin";

export const admin = {
  overview: () => apiFetch<AdminOverview>("/api/admin/overview"),
  listCircles: () => apiFetch<AdminCirclesResponse>("/api/admin/circles"),
  getCircle: (id: string) =>
    apiFetch<AdminCircleDetail>(`/api/admin/circles/${id}`),
  searchUsers: (q: string) =>
    apiFetch<AdminUsersSearchResponse>(
      `/api/admin/users/search?q=${encodeURIComponent(q)}`
    ),
  getUser: (id: string) =>
    apiFetch<AdminUserDetail>(`/api/admin/users/${id}`),
  promoteUser: (id: string, isSuperAdmin: boolean) =>
    apiFetch<{ success: true }>(`/api/admin/users/${id}/promote`, {
      method: "POST",
      body: { isSuperAdmin },
    }),
  spawnTestFamily: () =>
    apiFetch<SpawnFamilyResponse>("/api/admin/test-fixtures/family", {
      method: "POST",
    }),
  wipeTestFamilies: () =>
    apiFetch<WipeFamiliesResponse>("/api/admin/test-fixtures/wipe", {
      method: "POST",
    }),
  runAutoSchedule: (opts: { userId?: string; dryRun?: boolean }) =>
    apiFetch<AutoScheduleRunResponse>("/api/admin/auto-schedule/run", {
      method: "POST",
      body: opts,
    }),
  resetAutoSchedule: (opts: { userId?: string; circleId?: string }) =>
    apiFetch<ResetAutoScheduleResponse>("/api/admin/auto-schedule/reset", {
      method: "POST",
      body: opts,
    }),
  timeTravel: (opts: {
    membershipA: string;
    membershipB: string;
    daysAgo: number;
  }) =>
    apiFetch<TimeTravelResponse>("/api/admin/time-travel/connection", {
      method: "POST",
      body: opts,
    }),
  cronSweep: () =>
    apiFetch<SweepCronResponse>("/api/admin/cron/sweep", { method: "POST" }),
  cronAutoSchedule: () =>
    apiFetch<AutoScheduleRunResponse>("/api/admin/cron/auto-schedule", {
      method: "POST",
    }),
  cronRecurrence: () =>
    apiFetch<RecurrenceCronResponse>(
      "/api/admin/cron/recurrence-materialize",
      { method: "POST" }
    ),
  impersonateStart: (userId: string) =>
    apiFetch<ImpersonateStartResponse>("/api/admin/impersonate/start", {
      method: "POST",
      body: { userId },
    }),
  impersonateEnd: () =>
    apiFetch<{ success: true }>("/api/admin/impersonate/end", { method: "POST" }),
  audit: (filters?: {
    actor?: string;
    targetUser?: string;
    targetCircle?: string;
    kind?: string;
  }) => {
    const qs = new URLSearchParams();
    if (filters?.actor) qs.set("actor", filters.actor);
    if (filters?.targetUser) qs.set("targetUser", filters.targetUser);
    if (filters?.targetCircle) qs.set("targetCircle", filters.targetCircle);
    if (filters?.kind) qs.set("kind", filters.kind);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<AuditListResponse>(`/api/admin/audit${suffix}`);
  },
};
