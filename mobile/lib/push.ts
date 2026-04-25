import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { apiFetch } from "@/lib/api";

// Foreground notification handler — show banner + sound when the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushRegistrationResult =
  | { kind: "registered"; token: string }
  | { kind: "denied" }
  | { kind: "unsupported"; reason: string }
  | { kind: "error"; message: string };

/**
 * Request permission, fetch the Expo push token for this device, and
 * POST it to the server so notifications can be delivered. Idempotent —
 * safe to call on every sign-in. Returns a result the caller can use to
 * surface state in the prefs UI.
 */
export async function registerForPushAsync(): Promise<PushRegistrationResult> {
  if (!Device.isDevice) {
    return { kind: "unsupported", reason: "Push only works on physical devices." };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Family reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1f1916",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    return { kind: "denied" };
  }

  const projectId =
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    return { kind: "error", message: "Missing EAS projectId in app config." };
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;
    await apiFetch("/api/native/push/register", {
      method: "POST",
      body: { token },
    });
    return { kind: "registered", token };
  } catch (e) {
    return {
      kind: "error",
      message: e instanceof Error ? e.message : "Couldn't get push token.",
    };
  }
}

export async function unregisterPushAsync(token: string): Promise<void> {
  try {
    await apiFetch("/api/native/push/register", {
      method: "DELETE",
      body: { token },
    });
  } catch {
    // best effort; the server can also drop tokens that come back as
    // DeviceNotRegistered from Expo on next send.
  }
}
