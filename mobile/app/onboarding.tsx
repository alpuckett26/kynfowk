import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/ListItem";
import { completeOnboarding } from "@/lib/profile";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

function guessTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || "America/Chicago";
  } catch {
    return "America/Chicago";
  }
}

export default function OnboardingScreen() {
  const [fullName, setFullName] = useState("");
  const [circleName, setCircleName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(guessTimezone());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!fullName.trim()) {
      setError("Your name is required.");
      return;
    }
    if (!circleName.trim()) {
      setError("Pick a name for your family circle.");
      return;
    }
    setSubmitting(true);
    try {
      await completeOnboarding({
        fullName: fullName.trim(),
        circleName: circleName.trim(),
        description: description.trim() || undefined,
        timezone: timezone.trim() || undefined,
      });
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't finish setup.");
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
        <Text style={styles.eyebrow}>Welcome</Text>
        <Text style={styles.title}>Start your circle</Text>
        <Text style={styles.lede}>
          A family circle is a private space for the people you call. You can
          invite the rest of the family right after.
        </Text>
      </View>

      <Card>
        <SectionHeader title="You" />
        <Input
          label="Your name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Aaron Puckett"
        />
        <Input
          label="Timezone"
          value={timezone}
          onChangeText={setTimezone}
          placeholder="America/Chicago"
          autoCapitalize="none"
        />
      </Card>

      <Card>
        <SectionHeader title="Your circle" />
        <Input
          label="Circle name"
          value={circleName}
          onChangeText={setCircleName}
          placeholder="Dynasty House"
        />
        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="A line about what brings the circle together"
          multiline
        />
      </Card>

      <Button
        label={submitting ? "Setting up…" : "Create circle"}
        onPress={onSubmit}
        loading={submitting}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  error: { fontSize: fontSize.sm, color: colors.danger, textAlign: "center" },
});
