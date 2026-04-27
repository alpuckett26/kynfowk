/**
 * Hand-typed mirrors of the JSON shapes returned by /api/admin/* on
 * the web app. Keep in sync with app/api/admin/*.
 */

export interface AdminOverview {
  circleCount: number;
  userCount: number;
  autoScheduledNext7Days: number;
}

export interface AdminCircleSummary {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
  memberCount: number;
  lastActivityAt: string | null;
}

export interface AdminCirclesResponse {
  circles: AdminCircleSummary[];
}

export interface AdminMember {
  id: string;
  user_id: string | null;
  display_name: string;
  status: string;
  role: string;
  is_minor: boolean;
  managed_by_membership_id: string | null;
  parental_auto_schedule_consent: boolean;
  invite_email: string | null;
  created_at: string;
}

export interface AdminCallSummary {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  auto_scheduled: boolean;
  auto_schedule_tier: string | null;
  created_at: string;
}

export interface AdminActivityItem {
  id: string;
  activity_type: string;
  summary: string;
  created_at: string;
  actor_membership_id: string | null;
}

export interface AdminCircleDetail {
  circle: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    created_by: string | null;
  };
  members: AdminMember[];
  calls: AdminCallSummary[];
  activity: AdminActivityItem[];
}

export interface AdminUserSummary {
  id: string;
  email: string | null;
  full_name: string | null;
  timezone: string;
  is_super_admin: boolean;
  created_at: string;
}

export interface AdminUsersSearchResponse {
  users: AdminUserSummary[];
}

export interface AdminUserMembership {
  id: string;
  family_circle_id: string;
  display_name: string;
  role: string;
  status: string;
  is_minor: boolean;
  managed_by_membership_id: string | null;
  parental_auto_schedule_consent: boolean;
  family_circles: { id: string; name: string } | null;
}

export interface AdminUserDetail {
  profile: AdminUserSummary & {
    auto_schedule_enabled: boolean;
    auto_schedule_paused_until: string | null;
    auto_schedule_max_per_week: number;
  };
  memberships: AdminUserMembership[];
  recentCalls: Array<{
    membership_id: string;
    call_session_id: string;
    attended: boolean | null;
    call_sessions:
      | {
          id: string;
          title: string;
          scheduled_start: string;
          status: string;
          auto_scheduled: boolean;
          auto_schedule_tier: string | null;
          family_circle_id: string;
        }
      | null;
  }>;
}

export interface AutoScheduleProposal {
  selfMembershipId: string;
  selfDisplayName: string;
  kinMembershipId: string;
  kinDisplayName: string;
  tier: string;
  scheduledStart: string;
  scheduledEnd: string;
  participantMembershipIds: string[];
}

export interface AutoScheduleRunResponse {
  dryRun: boolean;
  aggregate: {
    attempted: number;
    scheduled: number;
    skippedByCooldown: number;
    skippedByNoOverlap: number;
    skippedByMinorParent: number;
    skippedByCap: number;
    skippedByConsent: number;
  };
  perUser: Array<{
    userId: string;
    result: AutoScheduleRunResponse["aggregate"];
    proposals?: AutoScheduleProposal[];
  }>;
}

export interface SpawnFamilyResponse {
  success: true;
  circleId: string;
  circleName: string;
  memberCount: number;
}

export interface WipeFamiliesResponse {
  success: true;
  deleted: number;
}

export interface ResetAutoScheduleResponse {
  success: true;
  canceled: number;
}

export interface TimeTravelResponse {
  success: true;
  mode: "shifted_existing" | "synthetic_call";
  callId: string;
}

export interface SweepCronResponse {
  success: true;
  circlesProcessed: number;
  notificationsCreated: number;
  emailDeliveriesSent: number;
  pushDeliveriesUpdated: number;
}

export interface RecurrenceCronResponse {
  success: true;
  totalInserted: number;
  perRule: { id: string; inserted: number }[];
}

export interface ImpersonateStartResponse {
  success: true;
  actionLink: string | null;
  hashedToken: string | null;
  email: string;
}

export interface AuditEntry {
  id: string;
  actor_user_id: string;
  actor_email: string | null;
  actor_name: string | null;
  action_kind: string;
  target_user_id: string | null;
  target_circle_id: string | null;
  payload: unknown;
  created_at: string;
}

export interface AuditListResponse {
  entries: AuditEntry[];
}
