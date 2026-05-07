import { useEffect } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { bootLog, formatBootLog, readAndClearBootLog } from "@/lib/boot-log";

bootLog("50 _layout.tsx imports starting");

import { colors } from "@/lib/theme";
import { useSession } from "@/hooks/useSession";
import { usePushRouting } from "@/hooks/usePushRouting";
import { SplashOverlay } from "@/components/SplashOverlay";
import { initializeAdMob } from "@/lib/admob-init";

bootLog("51 _layout.tsx imports complete");

function AuthGate({ children }: { children: React.ReactNode }) {
  bootLog("60 AuthGate render");
  const session = useSession();
  const segments = useSegments();

  useEffect(() => {
    if (session.status === "loading") return;
    const first = segments[0] as string | undefined;
    const inAuthFlow = first === "login" || first === "auth";
    if (session.status === "signed-out" && !inAuthFlow) {
      router.replace("/login");
      return;
    }
    if (session.status === "signed-in" && first === "login") {
      router.replace("/");
    }
  }, [session.status, segments]);

  if (session.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
}

function PushRouter() {
  bootLog("61 PushRouter render");
  usePushRouting();
  return null;
}

export default function RootLayout() {
  bootLog("70 RootLayout render");

  // M89 — on launch, check if a previous startup crash was persisted.
  // Shows the JS error message so we can diagnose without Xcode.
  // M91 — also display the boot breadcrumb trail of the previous boot
  // so we can pinpoint the last successful step before the crash.
  useEffect(() => {
    bootLog("71 RootLayout mount effect");
    Promise.all([
      AsyncStorage.getItem("@kf:startup_crash"),
      readAndClearBootLog(),
    ])
      .then(([crashMsg, prevBootEntries]) => {
        const sections: string[] = [];
        if (crashMsg) {
          AsyncStorage.removeItem("@kf:startup_crash").catch(() => {});
          sections.push("CRASH:\n" + crashMsg.slice(0, 400));
        }
        if (prevBootEntries.length > 0) {
          sections.push(
            "PREV BOOT TRAIL (last " +
              prevBootEntries.length +
              "):\n" +
              formatBootLog(prevBootEntries.slice(-30))
          );
        }
        if (sections.length === 0) return;
        Alert.alert(
          "Previous startup diagnosis",
          sections.join("\n\n").slice(0, 1500),
          [{ text: "OK" }]
        );
      })
      .catch(() => {});
  }, []);

  // M60 — kick off AdMob + ATT once at app boot. No-op when AdMob env
  // vars aren't set, no-op on subsequent calls.
  useEffect(() => {
    bootLog("72 RootLayout — calling initializeAdMob");
    void initializeAdMob();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthGate>
        <PushRouter />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="calls/[callId]/index" />
          <Stack.Screen name="calls/[callId]/live" />
          <Stack.Screen
            name="calls/[callId]/ring"
            options={{ presentation: "fullScreenModal", gestureEnabled: false }}
          />
          <Stack.Screen name="schedule/new" />
          <Stack.Screen name="family/invite" />
          <Stack.Screen name="family/placeholder" />
          <Stack.Screen name="family/[membershipId]" />
          <Stack.Screen name="settings/notifications" />
          <Stack.Screen name="settings/profile" />
          <Stack.Screen name="photos" />
          <Stack.Screen name="polls" />
          <Stack.Screen name="activity" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="feedback" />
          <Stack.Screen name="login" options={{ presentation: "modal" }} />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen name="admin/circles" />
          <Stack.Screen name="admin/circles/[id]" />
          <Stack.Screen name="admin/users" />
          <Stack.Screen name="admin/users/[id]" />
          <Stack.Screen name="admin/audit" />
        </Stack>
      </AuthGate>
      <SplashOverlay />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },
});
