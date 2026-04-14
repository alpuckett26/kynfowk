import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { registerForPushNotifications } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    registerForPushNotifications();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#ffffff" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="call/[callId]" options={{ animation: "fade" }} />
        <Stack.Screen
          name="post-call/[callId]"
          options={{ animation: "slide_from_bottom", gestureEnabled: false }}
        />
        <Stack.Screen name="auth" />
      </Stack>
    </>
  );
}
