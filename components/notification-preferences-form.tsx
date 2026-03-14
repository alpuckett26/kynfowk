"use client";

import { useActionState } from "react";

import {
  saveNotificationPreferencesAction,
  type NotificationPreferencesState
} from "@/app/actions";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import type { NotificationPreferenceSettings } from "@/lib/types";
import { describeQuietHours } from "@/lib/utils";

const initialState: NotificationPreferencesState = {
  status: "idle"
};

export function NotificationPreferencesForm({
  preferences,
  includeTimingFields = true
}: {
  preferences: NotificationPreferenceSettings;
  includeTimingFields?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveNotificationPreferencesAction,
    initialState
  );

  return (
    <form action={formAction} className="stack-md">
      <div className="field-grid two-col">
        <label className="attendance-item">
          <input defaultChecked={preferences.inAppEnabled} name="inAppEnabled" type="checkbox" />
          <span>In-app inbox</span>
        </label>
        <label className="attendance-item">
          <input defaultChecked={preferences.emailEnabled} name="emailEnabled" type="checkbox" />
          <span>Email reminders</span>
        </label>
        <label className="attendance-item">
          <input
            defaultChecked={preferences.weeklyDigestEnabled}
            name="weeklyDigestEnabled"
            type="checkbox"
          />
          <span>Weekly digest</span>
        </label>
        <label className="attendance-item">
          <input
            defaultChecked={preferences.reminder24hEnabled}
            name="reminder24hEnabled"
            type="checkbox"
          />
          <span>24h reminder</span>
        </label>
        <label className="attendance-item">
          <input
            defaultChecked={preferences.reminder15mEnabled}
            name="reminder15mEnabled"
            type="checkbox"
          />
          <span>15m reminder</span>
        </label>
        <label className="attendance-item">
          <input
            defaultChecked={preferences.startingNowEnabled}
            name="startingNowEnabled"
            type="checkbox"
          />
          <span>Starting now</span>
        </label>
        <label className="attendance-item">
          <input defaultChecked={preferences.pushEnabled} name="pushEnabled" type="checkbox" />
          <span>Future web push</span>
        </label>
      </div>

      {includeTimingFields ? (
        <>
          <div className="field-grid two-col">
            <label className="field">
              <span>Timezone</span>
              <input
                defaultValue={preferences.timezone}
                name="timezone"
                placeholder="America/Chicago"
              />
            </label>
            <label className="field">
              <span>Quiet hours</span>
              <div className="field-grid two-col">
                <input
                  defaultValue={preferences.quietHoursStart ?? ""}
                  max={23}
                  min={0}
                  name="quietHoursStart"
                  placeholder="Start hour"
                  type="number"
                />
                <input
                  defaultValue={preferences.quietHoursEnd ?? ""}
                  max={23}
                  min={0}
                  name="quietHoursEnd"
                  placeholder="End hour"
                  type="number"
                />
              </div>
            </label>
          </div>
          <p className="microcopy">
            {describeQuietHours(preferences.quietHoursStart ?? null, preferences.quietHoursEnd ?? null)}
          </p>
        </>
      ) : (
        <>
          <input name="timezone" type="hidden" value={preferences.timezone} />
          <input
            name="quietHoursStart"
            type="hidden"
            value={preferences.quietHoursStart ?? ""}
          />
          <input name="quietHoursEnd" type="hidden" value={preferences.quietHoursEnd ?? ""} />
        </>
      )}

      <PushNotificationSettings
        deliveryReady={preferences.pushDeliveryReady ?? false}
        enabled={preferences.pushEnabled}
        publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
        subscriptionCount={preferences.pushSubscriptionCount ?? 0}
      />

      {state.message ? (
        <p className={`form-message ${state.status === "success" ? "form-success" : ""}`}>
          {state.message}
        </p>
      ) : null}

      <button className="button button-secondary" disabled={pending} type="submit">
        {pending ? "Saving settings..." : "Save notification settings"}
      </button>
    </form>
  );
}
