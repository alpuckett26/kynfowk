import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();
// Safety net: force-hide splash when this module loads, same as the diagnostic build
SplashScreen.hideAsync().catch(() => {});

export function ErrorBoundary({ error }: { error: Error }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <View style={styles.error}>
      <Text style={styles.errorTitle}>Crash caught</Text>
      <Text style={styles.errorMsg}>{error.message}</Text>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
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

const styles = StyleSheet.create({
  error: {
    flex: 1,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  errorTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  errorMsg: { color: "#fca5a5", fontSize: 13, textAlign: "center", lineHeight: 20 },
});
