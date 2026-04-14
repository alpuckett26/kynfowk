import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { COLORS } from "@/lib/constants";

type AuthMode = "signin" | "signup" | "magic";

export default function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert("Sign in failed", error.message);
    } else {
      router.replace("/(tabs)");
    }
  }

  async function handleSignUp() {
    if (!email || !password || !familyName) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { family_name: familyName } },
    });
    setLoading(false);
    if (error) {
      Alert.alert("Sign up failed", error.message);
    } else {
      Alert.alert(
        "Check your email",
        "We sent a confirmation link. Once confirmed, sign in below.",
        [{ text: "OK", onPress: () => setMode("signin") }]
      );
    }
  }

  async function handleMagicLink() {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Magic link sent",
        "Check your email and tap the link to sign in.",
        [{ text: "OK" }]
      );
    }
  }

  function handleSubmit() {
    if (mode === "signin") handleSignIn();
    else if (mode === "signup") handleSignUp();
    else handleMagicLink();
  }

  const submitLabel =
    mode === "signin"
      ? "Sign in"
      : mode === "signup"
      ? "Create account"
      : "Send magic link";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logo}>
          <Text style={styles.logoEmoji}>💜</Text>
          <Text style={styles.logoText}>Kynfowk</Text>
          <Text style={styles.logoTagline}>Keep your family close</Text>
        </View>

        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          {(["signin", "signup", "magic"] as AuthMode[]).map((m) => (
            <Pressable
              key={m}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}
              onPress={() => setMode(m)}
            >
              <Text
                style={[
                  styles.modeTabText,
                  mode === m && styles.modeTabTextActive,
                ]}
              >
                {m === "signin"
                  ? "Sign in"
                  : m === "signup"
                  ? "Sign up"
                  : "Magic link"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="Family name (e.g. The Hendersons)"
              placeholderTextColor={COLORS.gray400}
              value={familyName}
              onChangeText={setFamilyName}
              autoCapitalize="words"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={COLORS.gray400}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {mode !== "magic" && (
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={COLORS.gray400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          )}

          {mode === "magic" && (
            <Text style={styles.magicHint}>
              We&apos;ll email you a one-tap link — no password needed.
            </Text>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.submitBtnPressed,
              loading && styles.submitBtnLoading,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>{submitLabel} →</Text>
            )}
          </Pressable>
        </View>

        {/* Social auth note */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <SocialBtn label="Apple" icon="🍎" onPress={() => {}} />
          <SocialBtn label="Google" icon="🔍" onPress={() => {}} />
        </View>

        <Text style={styles.legal}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function SocialBtn({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.socialBtn} onPress={onPress}>
      <Text style={styles.socialIcon}>{icon}</Text>
      <Text style={styles.socialLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 80 : 60,
    paddingBottom: 32,
    justifyContent: "center",
    gap: 20,
  },
  logo: { alignItems: "center", gap: 6, marginBottom: 8 },
  logoEmoji: { fontSize: 48 },
  logoText: { fontSize: 32, fontWeight: "800", color: COLORS.gray900 },
  logoTagline: { fontSize: 15, color: COLORS.gray500 },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: COLORS.gray100,
    borderRadius: 16,
    padding: 4,
  },
  modeTab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: "center",
  },
  modeTabActive: { backgroundColor: COLORS.white, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  modeTabText: { fontSize: 13, fontWeight: "600", color: COLORS.gray500 },
  modeTabTextActive: { color: COLORS.gray900 },
  form: { gap: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.gray900,
    backgroundColor: COLORS.white,
  },
  magicHint: {
    fontSize: 13,
    color: COLORS.gray500,
    textAlign: "center",
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnPressed: { opacity: 0.88 },
  submitBtnLoading: { opacity: 0.7 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.gray100 },
  dividerText: { fontSize: 13, color: COLORS.gray400 },
  socialRow: { flexDirection: "row", gap: 12 },
  socialBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    borderRadius: 14,
    paddingVertical: 13,
  },
  socialIcon: { fontSize: 18 },
  socialLabel: { fontSize: 14, fontWeight: "600", color: COLORS.gray700 },
  legal: {
    fontSize: 11,
    color: COLORS.gray400,
    textAlign: "center",
    lineHeight: 16,
  },
});
