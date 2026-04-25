import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";

/**
 * Magic-link deep-link handler. Supabase redirects to
 * kynfowk://auth/callback?code=... on the device after the user
 * taps the link in their email. We exchange the code for a session
 * (which persists via AsyncStorage) and bounce to home.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [state, setState] = useState<
    | { kind: "exchanging" }
    | { kind: "success" }
    | { kind: "error"; message: string }
  >({ kind: "exchanging" });

  useEffect(() => {
    void (async () => {
      // Supabase redirected with an error in query params (e.g. expired link).
      if (params.error) {
        setState({
          kind: "error",
          message: params.error_description ?? params.error,
        });
        return;
      }

      const code = params.code;
      if (!code) {
        setState({
          kind: "error",
          message:
            "No code in the magic link URL. The link may have been opened in the wrong app — try the link again from your email.",
        });
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setState({ kind: "error", message: error.message });
        return;
      }

      setState({ kind: "success" });
      router.replace("/");
    })();
  }, [params.code, params.error, params.error_description]);

  if (state.kind === "exchanging") {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
        <Text style={styles.body}>Signing you in…</Text>
      </View>
    );
  }

  if (state.kind === "success") {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Couldn&apos;t sign you in</Text>
      <Text style={styles.body}>{state.message}</Text>
      <Pressable style={styles.cta} onPress={() => router.replace("/login")}>
        <Text style={styles.ctaText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdf6ec",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  title: { fontSize: 22, fontWeight: "800", color: "#1f1916" },
  body: {
    fontSize: 14,
    color: "#3f342b",
    lineHeight: 20,
    textAlign: "center",
  },
  cta: {
    marginTop: 8,
    backgroundColor: "#1f1916",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaText: { color: "#fdf6ec", fontWeight: "700", fontSize: 14 },
});
