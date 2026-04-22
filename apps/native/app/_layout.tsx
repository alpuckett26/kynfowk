import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { View, Text, ScrollView } from "react-native";
import { registerForPushNotifications } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

// Capture JS errors that happen before or after React mounts
let _earlyError: Error | null = null;
const _prevHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
(global as any).ErrorUtils?.setGlobalHandler?.((err: Error, isFatal: boolean) => {
  _earlyError = err;
  _prevHandler?.(err, isFatal);
});

function ErrorScreen({ error }: { error: Error }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 24, paddingTop: 60 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: "#dc2626", marginBottom: 8 }}>
        Startup error
      </Text>
      <ScrollView>
        <Text style={{ fontSize: 13, color: "#111", marginBottom: 12 }}>
          {error.message}
        </Text>
        <Text style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>
          {error.stack}
        </Text>
      </ScrollView>
    </View>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <ErrorScreen error={this.state.error} />;
    return this.props.children;
  }
}

export default function RootLayout() {
  const [fatalError, setFatalError] = useState<Error | null>(_earlyError);

  useEffect(() => {
    const prev = (global as any).ErrorUtils?.getGlobalHandler?.();
    (global as any).ErrorUtils?.setGlobalHandler?.((err: Error, isFatal: boolean) => {
      setFatalError(err);
      prev?.(err, isFatal);
    });
    SplashScreen.hideAsync();
    registerForPushNotifications();
  }, []);

  if (fatalError) return <ErrorScreen error={fatalError} />;

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
