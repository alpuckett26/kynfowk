export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          timezone?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          timezone?: string;
        };
      };
      family_circles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_by: string;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
      };
      family_memberships: {
        Row: {
          id: string;
          family_circle_id: string;
          user_id: string | null;
          display_name: string;
          invite_email: string | null;
          relationship_label: string | null;
          status: "active" | "invited";
          role: "owner" | "member";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          family_circle_id: string;
          user_id?: string | null;
          display_name: string;
          invite_email?: string | null;
          relationship_label?: string | null;
          status?: "active" | "invited";
          role?: "owner" | "member";
        };
        Update: {
          user_id?: string | null;
          display_name?: string;
          invite_email?: string | null;
          relationship_label?: string | null;
          status?: "active" | "invited";
          role?: "owner" | "member";
        };
      };
      availability_windows: {
        Row: {
          id: string;
          family_circle_id: string;
          membership_id: string;
          user_id: string;
          weekday: number;
          start_hour: number;
          end_hour: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_circle_id: string;
          membership_id: string;
          user_id: string;
          weekday: number;
          start_hour: number;
          end_hour: number;
        };
        Update: never;
      };
      call_sessions: {
        Row: {
          id: string;
          family_circle_id: string;
          title: string;
          scheduled_start: string;
          scheduled_end: string;
          status: "scheduled" | "live" | "completed" | "canceled";
          actual_duration_minutes: number | null;
          meeting_provider: string | null;
          meeting_url: string | null;
          actual_started_at: string | null;
          actual_ended_at: string | null;
          recovery_dismissed_at: string | null;
          reminder_status: "pending" | "sent" | "not_needed" | null;
          reminder_sent_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_circle_id: string;
          title: string;
          scheduled_start: string;
          scheduled_end: string;
          status?: "scheduled" | "live" | "completed" | "canceled";
          actual_duration_minutes?: number | null;
          meeting_provider?: string | null;
          meeting_url?: string | null;
          actual_started_at?: string | null;
          actual_ended_at?: string | null;
          recovery_dismissed_at?: string | null;
          reminder_status?: "pending" | "sent" | "not_needed" | null;
          reminder_sent_at?: string | null;
          created_by: string;
        };
        Update: {
          title?: string;
          scheduled_start?: string;
          scheduled_end?: string;
          status?: "scheduled" | "live" | "completed" | "canceled";
          actual_duration_minutes?: number | null;
          meeting_provider?: string | null;
          meeting_url?: string | null;
          actual_started_at?: string | null;
          actual_ended_at?: string | null;
          recovery_dismissed_at?: string | null;
          reminder_status?: "pending" | "sent" | "not_needed" | null;
          reminder_sent_at?: string | null;
        };
      };
      call_participants: {
        Row: {
          id: string;
          call_session_id: string;
          membership_id: string;
          attended: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          call_session_id: string;
          membership_id: string;
          attended?: boolean | null;
        };
        Update: {
          attended?: boolean | null;
        };
      };
      family_activity: {
        Row: {
          id: string;
          family_circle_id: string;
          actor_membership_id: string | null;
          activity_type: string;
          summary: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_circle_id: string;
          actor_membership_id?: string | null;
          activity_type: string;
          summary: string;
          metadata?: Json | null;
        };
        Update: never;
      };
      call_recaps: {
        Row: {
          call_session_id: string;
          summary: string | null;
          highlight: string | null;
          next_step: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          call_session_id: string;
          summary?: string | null;
          highlight?: string | null;
          next_step?: string | null;
          created_by: string;
        };
        Update: {
          summary?: string | null;
          highlight?: string | null;
          next_step?: string | null;
          created_by?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          family_circle_id: string | null;
          call_session_id: string | null;
          type:
            | "call_scheduled"
            | "reminder_24h_before"
            | "reminder_15m_before"
            | "starting_now"
            | "missing_join_link_warning"
            | "call_passed_without_completion"
            | "invite_claimed"
            | "recap_posted"
            | "weekly_connection_digest"
            | "weekly_briefing";
          title: string;
          body: string;
          cta_label: string | null;
          cta_href: string | null;
          metadata: Json | null;
          dedupe_key: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          family_circle_id?: string | null;
          call_session_id?: string | null;
          type:
            | "call_scheduled"
            | "reminder_24h_before"
            | "reminder_15m_before"
            | "starting_now"
            | "missing_join_link_warning"
            | "call_passed_without_completion"
            | "invite_claimed"
            | "recap_posted"
            | "weekly_connection_digest"
            | "weekly_briefing";
          title: string;
          body: string;
          cta_label?: string | null;
          cta_href?: string | null;
          metadata?: Json | null;
          dedupe_key?: string | null;
          read_at?: string | null;
        };
        Update: {
          read_at?: string | null;
        };
      };
      notification_preferences: {
        Row: {
          user_id: string;
          in_app_enabled: boolean;
          email_enabled: boolean;
          weekly_digest_enabled: boolean;
          reminder_24h_enabled: boolean;
          reminder_15m_enabled: boolean;
          starting_now_enabled: boolean;
          push_enabled: boolean;
          quiet_hours_start: number | null;
          quiet_hours_end: number | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          in_app_enabled?: boolean;
          email_enabled?: boolean;
          weekly_digest_enabled?: boolean;
          reminder_24h_enabled?: boolean;
          reminder_15m_enabled?: boolean;
          starting_now_enabled?: boolean;
          push_enabled?: boolean;
          quiet_hours_start?: number | null;
          quiet_hours_end?: number | null;
          timezone?: string;
        };
        Update: {
          in_app_enabled?: boolean;
          email_enabled?: boolean;
          weekly_digest_enabled?: boolean;
          reminder_24h_enabled?: boolean;
          reminder_15m_enabled?: boolean;
          starting_now_enabled?: boolean;
          push_enabled?: boolean;
          quiet_hours_start?: number | null;
          quiet_hours_end?: number | null;
          timezone?: string;
        };
      };
      notification_deliveries: {
        Row: {
          id: string;
          notification_id: string;
          user_id: string;
          channel: "in_app" | "email" | "push";
          status: "queued" | "sent" | "skipped" | "failed";
          recipient: string | null;
          provider_message_id: string | null;
          error_message: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          notification_id: string;
          user_id: string;
          channel: "in_app" | "email" | "push";
          status?: "queued" | "sent" | "skipped" | "failed";
          recipient?: string | null;
          provider_message_id?: string | null;
          error_message?: string | null;
          sent_at?: string | null;
        };
        Update: {
          status?: "queued" | "sent" | "skipped" | "failed";
          recipient?: string | null;
          provider_message_id?: string | null;
          error_message?: string | null;
          sent_at?: string | null;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          last_seen_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          last_seen_at?: string;
        };
        Update: {
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          last_seen_at?: string;
        };
      };
      pilot_feedback: {
        Row: {
          id: string;
          user_id: string;
          family_circle_id: string | null;
          call_session_id: string | null;
          category: "bug" | "confusing" | "suggestion" | "positive";
          page_path: string | null;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          family_circle_id?: string | null;
          call_session_id?: string | null;
          category: "bug" | "confusing" | "suggestion" | "positive";
          page_path?: string | null;
          message: string;
        };
        Update: never;
      };
      product_events: {
        Row: {
          id: string;
          user_id: string | null;
          family_circle_id: string | null;
          call_session_id: string | null;
          event_name:
            | "signup_completed"
            | "signin_completed"
            | "family_circle_created"
            | "invite_claimed"
            | "availability_saved"
            | "call_scheduled"
            | "join_clicked"
            | "call_completed"
            | "recap_saved"
            | "push_enabled";
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          family_circle_id?: string | null;
          call_session_id?: string | null;
          event_name:
            | "signup_completed"
            | "signin_completed"
            | "family_circle_created"
            | "invite_claimed"
            | "availability_saved"
            | "call_scheduled"
            | "join_clicked"
            | "call_completed"
            | "recap_saved"
            | "push_enabled";
          metadata?: Json | null;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
