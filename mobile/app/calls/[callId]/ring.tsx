import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, Vibration } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Screen } from "@/components/Screen";
import {
  answerIncomingCall,
  declineIncomingCall,
} from "@/lib/calls";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

/**
 * M42 — Incoming-call screen.
 *
 * Routed to from the push-notification handler when a notification with
 * data.type === "incoming_call" arrives. Shows the caller's name + circle,
 * vibrates the device for the duration of the ring, and offers
 * Accept / Decline.
 *
 * V1 limitations:
 * - On iOS the device only vibrates + plays the system push sound when
 *   the app is in foreground; lock-screen full ringtone needs CallKit
 *   (V2 follow-up).
 * - Auto-times-out at 30s on the recipient side; if the caller cancels
 *   first, the call_sessions row will already be 'canceled' when the
 *   recipient's accept call returns 409 — we handle that gracefully.
 */
export default function IncomingCallScreen() {
  const { callId, callerName, circleName } = useLocalSearchParams<{
    callId: string;
    callerName?: string;
    circleName?: string;
  }>();
  const [busy, setBusy] = useState<"none" | "answering" | "declining">("none");
  const vibrationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Vibrate in a 1-on / 2-off pattern for up to 30s. Stops as soon as
  // the user accepts/declines or the screen unmounts.
  useEffect(() => {
    let cancelled = false;
    let elapsed = 0;
    const tick = () => {
      if (cancelled) return;
      Vibration.vibrate([0, 800, 400, 800, 400], false);
      elapsed += 2400;
      if (elapsed >= 30_000) return;
      vibrationRef.current = setTimeout(tick, 2400);
    };
    tick();
    return () => {
      cancelled = true;
      if (vibrationRef.current) clearTimeout(vibrationRef.current);
      Vibration.cancel();
    };
  }, []);

  // 30s auto-timeout — if neither side has acted, treat as a missed
  // call and dismiss the screen.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (busy === "none") {
        router.replace("/");
      }
    }, 30_000);
    return () => clearTimeout(timeoutId);
  }, [busy]);

  const handleAccept = async () => {
    if (!callId || busy !== "none") return;
    setBusy("answering");
    try {
      await answerIncomingCall(callId);
      router.replace(`/calls/${callId}/live`);
    } catch (e) {
      Alert.alert(
        "Couldn't pick up",
        e instanceof Error ? e.message : "Try again?"
      );
      setBusy("none");
    }
  };

  const handleDecline = async () => {
    if (!callId || busy !== "none") return;
    setBusy("declining");
    try {
      await declineIncomingCall(callId);
    } catch {
      // Ignore — caller may have already canceled.
    }
    router.replace("/");
  };

  return (
    <Screen scroll={false} contentStyle={styles.shell}>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>Incoming call</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>
            {callerName?.charAt(0).toUpperCase() ?? "?"}
          </Text>
        </View>
        <Text style={styles.callerName} numberOfLines={1}>
          {callerName ?? "A family member"}
        </Text>
        {circleName ? (
          <Text style={styles.circleName} numberOfLines={1}>
            {circleName}
          </Text>
        ) : null}
        <Text style={styles.ringingHint}>is calling you on Kynfowk…</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.actionButton,
            styles.declineButton,
            pressed && styles.pressed,
          ]}
          onPress={handleDecline}
          disabled={busy !== "none"}
        >
          <Text style={styles.declineGlyph}>✕</Text>
          <Text style={styles.actionLabel}>Decline</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.actionButton,
            styles.acceptButton,
            pressed && styles.pressed,
          ]}
          onPress={handleAccept}
          disabled={busy !== "none"}
        >
          <Text style={styles.acceptGlyph}>✓</Text>
          <Text style={styles.actionLabel}>Accept</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    paddingVertical: spacing.xxl,
    justifyContent: "space-between",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.accent,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  avatarLetter: {
    fontSize: 56,
    fontWeight: fontWeight.black,
    color: colors.accent,
  },
  callerName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.text,
    textAlign: "center",
  },
  circleName: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
  ringingHint: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
    marginTop: spacing.lg,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  actionButton: {
    width: 96,
    alignItems: "center",
    gap: spacing.sm,
  },
  declineButton: {},
  acceptButton: {},
  declineGlyph: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.danger,
    color: colors.surface,
    fontSize: 36,
    textAlign: "center",
    lineHeight: 80,
    overflow: "hidden",
  },
  acceptGlyph: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    color: colors.surface,
    fontSize: 36,
    textAlign: "center",
    lineHeight: 80,
    overflow: "hidden",
  },
  actionLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  pressed: { opacity: 0.7 },
});
