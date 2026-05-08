import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { useSession } from "@/hooks/useSession";
import { usePushRouting } from "@/hooks/usePushRouting";
import { SplashOverlay } from "@/components/SplashOverlay";

function AuthGate({ children }: { children: React.ReactNode }) {
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
  usePushRouting();
  return null;
}

export default function RootLayout() {
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
