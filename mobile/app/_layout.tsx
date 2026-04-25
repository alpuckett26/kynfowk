import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, router, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";
import { useSession } from "@/hooks/useSession";

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

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="calls/[callId]" />
          <Stack.Screen name="schedule/new" />
          <Stack.Screen name="family/invite" />
          <Stack.Screen name="family/placeholder" />
          <Stack.Screen name="family/[membershipId]" />
          <Stack.Screen name="login" options={{ presentation: "modal" }} />
          <Stack.Screen name="auth/callback" />
        </Stack>
      </AuthGate>
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
