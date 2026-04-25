import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Toggle } from "@/components/Toggle";
import { SectionHeader } from "@/components/ListItem";
import { addPlaceholder } from "@/lib/family";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

export default function PlaceholderScreen() {
  const [displayName, setDisplayName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [isDeceased, setIsDeceased] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      await addPlaceholder({
        displayName: displayName.trim(),
        relationshipLabel: relationship.trim() || undefined,
        isDeceased,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add member");
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
        <Text style={styles.eyebrow}>Placeholder</Text>
        <Text style={styles.title}>Add a family member</Text>
        <Text style={styles.lede}>
          Use this to honor someone in memoriam, or to keep a non-tech relative
          in the family map without an account.
        </Text>
      </View>
      <Card>
        <SectionHeader title="Their details" />
        <Input
          label="Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Grandpa John"
        />
        <Input
          label="Relationship (optional)"
          value={relationship}
          onChangeText={setRelationship}
          placeholder="Grandfather, great-aunt…"
        />
        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="A few words to remember"
          multiline
        />
        <Toggle
          label="In memoriam"
          subtitle="Mark this person as deceased"
          checked={isDeceased}
          onToggle={() => setIsDeceased((v) => !v)}
        />
      </Card>
      <Button
        label={submitting ? "Adding…" : "Add member"}
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
