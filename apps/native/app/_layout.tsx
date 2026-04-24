import { useEffect } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();
SplashScreen.hideAsync().catch(() => {});

declare const global: { ErrorUtils?: { getGlobalHandler: () => Function; setGlobalHandler: (h: Function) => void } };
const eu = global.ErrorUtils;
if (eu) {
  const original = eu.getGlobalHandler();
  eu.setGlobalHandler((error: Error & { name?: string }, isFatal: boolean) => {
    const msg = `${error?.name ?? "Error"}: ${error?.message ?? String(error)}\n\nFatal: ${isFatal}\n\n${(error?.stack ?? "no stack").slice(0, 800)}`;
    try { Alert.alert("Caught JS error", msg); } catch {}
    try { console.error("DIAGNOSTIC GLOBAL ERROR:", msg); } catch {}
    original(error, isFatal);
  });
}

export function ErrorBoundary({ error }: { error: Error }) {
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);
  return (
    <View style={s.err}>
      <Text style={s.title}>Crash (boundary)</Text>
      <Text style={s.msg}>{error.message}</Text>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
    </Stack>
  );
}

const s = StyleSheet.create({
  err: { flex: 1, backgroundColor: "#dc2626", justifyContent: "center", alignItems: "center", padding: 24 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  msg: { color: "#fca5a5", fontSize: 13, textAlign: "center", marginTop: 8 },
});
