import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(): Promise<
  string | undefined
> {
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device.");
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted.");
    return;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("call-reminders", {
      name: "Call Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#d946ef",
    });
  }

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    })
  ).data;

  return token;
}

/** Schedule a local notification N minutes before a call */
export async function scheduleCallReminder(
  callTitle: string,
  callTime: Date,
  minutesBefore = 10
): Promise<string> {
  const triggerDate = new Date(
    callTime.getTime() - minutesBefore * 60 * 1000
  );

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "📞 Call starting soon",
      body: `${callTitle} starts in ${minutesBefore} minutes. Tap to join.`,
      data: { type: "call_reminder" },
      sound: true,
    },
    trigger: { date: triggerDate },
  });

  return id;
}

export async function cancelCallReminder(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
