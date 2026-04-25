import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

// Hard-coded so it exactly matches the Supabase Auth → URL Configuration →
// Redirect URLs allow-list entry. expo-linking's createURL returns
// "kynfowk:///auth/callback" (triple slash, empty host) which Supabase
// treats as a different value than "kynfowk://auth/callback". Mismatched
// values cause Supabase to silently fall back to Site URL.
const REDIRECT_URL = "kynfowk://auth/callback";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "sending" }
    | { kind: "sent" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function send() {
    if (!email.trim()) {
      setStatus({ kind: "error", message: "Enter your email." });
      return;
    }
    setStatus({ kind: "sending" });
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: REDIRECT_URL },
    });
    if (error) {
      setStatus({ kind: "error", message: error.message });
      return;
    }
    setStatus({ kind: "sent" });
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.body}>
        We&apos;ll email you a magic link. No password needed.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="you@email.com"
        placeholderTextColor="#a99680"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          if (status.kind === "error") setStatus({ kind: "idle" });
        }}
      />

      <Pressable
        style={[styles.cta, status.kind === "sending" && styles.ctaDisabled]}
        onPress={send}
        disabled={status.kind === "sending"}
      >
        {status.kind === "sending" ? (
          <ActivityIndicator color="#fdf6ec" />
        ) : (
          <Text style={styles.ctaText}>Send magic link</Text>
        )}
      </Pressable>

      {status.kind === "sent" && (
        <Text style={styles.success}>
          Sent. Check your email and tap the link on this device.
        </Text>
      )}
      {status.kind === "error" && (
        <Text style={styles.error}>{status.message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdf6ec",
    paddingHorizontal: 24,
    paddingTop: 60,
    gap: 16,
  },
  back: { fontSize: 14, color: "#8a7a66" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f1916",
    marginTop: 16,
  },
  body: { fontSize: 15, color: "#3f342b", lineHeight: 22 },
  input: {
    marginTop: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e3d4be",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1f1916",
  },
  cta: {
    backgroundColor: "#1f1916",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#fdf6ec", fontWeight: "700", fontSize: 14 },
  success: {
    marginTop: 8,
    backgroundColor: "#e7f0e3",
    color: "#3a5d2c",
    padding: 14,
    borderRadius: 12,
    fontSize: 14,
  },
  error: {
    marginTop: 8,
    backgroundColor: "#f5dada",
    color: "#7a2727",
    padding: 14,
    borderRadius: 12,
    fontSize: 14,
  },
});
