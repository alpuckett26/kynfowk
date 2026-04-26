import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/ListItem";
import { sendFeedback } from "@/lib/profile";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type { FeedbackCategory } from "@/types/api";

const CATEGORIES: { value: FeedbackCategory; emoji: string; label: string }[] = [
  { value: "bug", emoji: "🐞", label: "Bug" },
  { value: "confusing", emoji: "😕", label: "Confusing" },
  { value: "suggestion", emoji: "💡", label: "Suggestion" },
  { value: "positive", emoji: "❤️", label: "Love it" },
];

export default function FeedbackScreen() {
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "sent" }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const onSubmit = async () => {
    if (!category) {
      setStatus({ kind: "error", message: "Pick a category first." });
      return;
    }
    if (!message.trim()) {
      setStatus({ kind: "error", message: "Add a few words so we can learn." });
      return;
    }
    setSubmitting(true);
    setStatus({ kind: "idle" });
    try {
      await sendFeedback({
        category,
        message: message.trim(),
        pagePath: "native",
      });
      setStatus({ kind: "sent" });
      setMessage("");
      setCategory(null);
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Couldn't send",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Feedback</Text>
        <Text style={styles.title}>Tell us what's up</Text>
        <Text style={styles.lede}>
          What's broken, confusing, or worth keeping. Goes straight to the
          team building this app.
        </Text>
      </View>

      <Card>
        <SectionHeader title="Type" />
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => {
            const on = category === c.value;
            return (
              <Pressable
                key={c.value}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => setCategory(c.value)}
              >
                <Text style={styles.chipEmoji}>{c.emoji}</Text>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card>
        <SectionHeader title="Message" />
        <Input
          value={message}
          onChangeText={setMessage}
          placeholder="What happened? What did you expect?"
          multiline
        />
      </Card>

      <Button
        label={submitting ? "Sending…" : "Send feedback"}
        onPress={onSubmit}
        loading={submitting}
      />
      {status.kind === "sent" ? (
        <Text style={styles.success}>Sent. Thank you.</Text>
      ) : null}
      {status.kind === "error" ? (
        <Text style={styles.error}>{status.message}</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", marginBottom: spacing.xs },
  header: { gap: 4 },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  lede: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipEmoji: { fontSize: 18 },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  chipTextOn: { color: colors.primaryText },
  success: { fontSize: fontSize.sm, color: colors.success, textAlign: "center" },
  error: { fontSize: fontSize.sm, color: colors.danger, textAlign: "center" },
});
