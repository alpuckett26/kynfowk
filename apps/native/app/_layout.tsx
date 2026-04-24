import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();
SplashScreen.hideAsync().catch(() => {});

export function ErrorBoundary({ error }: { error: Error }) {
  useEffect(() => { SplashScreen.hideAsync().catch(() => {}); }, []);
  return (
    <View style={s.err}>
      <Text style={s.title}>Crash</Text>
      <Text style={s.msg}>{error.message}</Text>
    </View>
  );
}

export default function RootLayout() {
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
