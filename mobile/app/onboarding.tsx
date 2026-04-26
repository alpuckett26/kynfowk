import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Toggle } from "@/components/Toggle";
import { SectionHeader } from "@/components/ListItem";
import { completeOnboarding } from "@/lib/profile";
import { saveAutoScheduleSettings } from "@/lib/auto-schedule";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

function guessTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || "America/Chicago";
  } catch {
    return "America/Chicago";
  }
}

type Step = "details" | "consent";

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>("details");
  const [fullName, setFullName] = useState("");
  const [circleName, setCircleName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(guessTimezone());
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onContinue = () => {
    setError(null);
    if (!fullName.trim()) {
      setError("Your name is required.");
      return;
    }
    if (!circleName.trim()) {
      setError("Pick a name for your family circle.");
      return;
    }
    setStep("consent");
  };

  const onFinish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await completeOnboarding({
        fullName: fullName.trim(),
        circleName: circleName.trim(),
        description: description.trim() || undefined,
        timezone: timezone.trim() || undefined,
      });
      // Persist auto-schedule preference. The default in the schema is true,
      // so we only need to flip if the user opted out.
      if (!autoScheduleEnabled) {
        try {
          await saveAutoScheduleSettings({ enabled: false });
        } catch {
          // Best-effort. The user can adjust in Settings.
        }
      }
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't finish setup.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "consent") {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Button
            label="← Back"
            variant="ghost"
            onPress={() => setStep("details")}
          />
        </View>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>One more thing</Text>
          <Text style={styles.title}>Auto-scheduled family calls</Text>
          <Text style={styles.lede}>
            Family is the point. Letting calls slide is the problem we solve.
          </Text>
        </View>

        <Card>
          <SectionHeader title="How it works" />
          <Text style={styles.body}>
            Kynfowk reads your relationships and puts calls on the calendar
            automatically:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bullet}>
              <Text style={styles.bold}>Immediate family</Text> — every week
              (parent, child, spouse, partner)
            </Text>
            <Text style={styles.bullet}>
              <Text style={styles.bold}>Close family</Text> — every two weeks
              (siblings, grandparents, in-laws)
            </Text>
            <Text style={styles.bullet}>
              <Text style={styles.bold}>Extended family</Text> — every month
              (cousins, aunts, uncles)
            </Text>
            <Text style={styles.bullet}>
              <Text style={styles.bold}>Distant family</Text> — every quarter
            </Text>
          </View>
          <Text style={styles.body}>
            You can decline any single call, pause for a week or a month, or
            turn it off entirely in Settings. Calls involving minors require
            their managing parent to be present.
          </Text>
        </Card>

        <Card>
          <Toggle
            label="Yes, auto-schedule my family calls"
            subtitle="Recommended — this is what makes Kynfowk work."
            checked={autoScheduleEnabled}
            onToggle={() => setAutoScheduleEnabled((v) => !v)}
          />
        </Card>

        <Button
          label={submitting ? "Setting up…" : "Create circle"}
          onPress={onFinish}
          loading={submitting}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Screen>
    );
  }

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

      <Button label="Continue" onPress={onContinue} />
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
  body: { fontSize: fontSize.sm, color: colors.text, lineHeight: 21 },
  bulletList: { gap: spacing.xs, paddingLeft: spacing.sm },
  bullet: { fontSize: fontSize.sm, color: colors.text, lineHeight: 21 },
  bold: { fontWeight: fontWeight.bold },
  error: { fontSize: fontSize.sm, color: colors.danger, textAlign: "center" },
});
