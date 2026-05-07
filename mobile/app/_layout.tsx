import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

/**
 * M93 — DO NOT use Alert.alert anywhere on the boot path.
 *
 * iOS 26 removed UIApplication.keyWindow, which RCTAlertManager.alertWithArgs
 * (the void TurboModule that backs RN's Alert) relies on. Any Alert.alert
 * call from JS triggers an ObjC exception in performVoidMethodInvocation,
 * which the dispatch queue rethrows → process abort. M87 fixed this in the
 * fatal JS error handler. M91 reintroduced it via a "Previous startup
 * diagnosis" alert here. M93 replaces the alert with an in-app overlay that
 * uses plain View + Text + ScrollView — no UIAlertController in sight.
 */
function DiagnosisOverlay() {
  const [diagnosis, setDiagnosis] = useState<string | null>(null);

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
          sections.push("CRASH:\n" + crashMsg.slice(0, 600));
        }
        if (prevBootEntries.length > 0) {
          sections.push(
            "PREV BOOT TRAIL (last " +
              prevBootEntries.length +
              "):\n" +
              formatBootLog(prevBootEntries.slice(-50))
          );
        }
        if (sections.length === 0) return;
        setDiagnosis(sections.join("\n\n"));
      })
      .catch(() => {});
  }, []);

  if (!diagnosis) return null;

  return (
    <View style={styles.diagnosisOverlay} pointerEvents="box-none">
      <View style={styles.diagnosisCard}>
        <Text style={styles.diagnosisTitle}>Previous startup diagnosis</Text>
        <ScrollView style={styles.diagnosisScroll}>
          <Text style={styles.diagnosisText}>{diagnosis}</Text>
        </ScrollView>
        <Pressable
          style={styles.diagnosisDismiss}
          onPress={() => setDiagnosis(null)}
        >
          <Text style={styles.diagnosisDismissText}>Dismiss</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function RootLayout() {
  bootLog("70 RootLayout render");

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
      <DiagnosisOverlay />
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
  diagnosisOverlay: {
    position: "absolute",
    top: 60,
    left: 12,
    right: 12,
    bottom: 60,
    justifyContent: "flex-end",
  },
  diagnosisCard: {
    backgroundColor: "rgba(20, 20, 20, 0.96)",
    borderRadius: 12,
    padding: 12,
    maxHeight: "80%",
  },
  diagnosisTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  diagnosisScroll: {
    maxHeight: 360,
    marginBottom: 8,
  },
  diagnosisText: {
    color: "#e0e0e0",
    fontSize: 11,
    fontFamily: "Menlo",
    lineHeight: 14,
  },
  diagnosisDismiss: {
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#444",
    borderRadius: 6,
  },
  diagnosisDismissText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
