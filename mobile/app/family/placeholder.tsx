import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Toggle } from "@/components/Toggle";
import { SectionHeader } from "@/components/ListItem";
import { addPlaceholder, fetchFamilyMembers } from "@/lib/family";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type { FamilyMember } from "@/types/api";

export default function PlaceholderScreen() {
  const [displayName, setDisplayName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [notes, setNotes] = useState("");
  const [isDeceased, setIsDeceased] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [managedBy, setManagedBy] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetchFamilyMembers();
      if (res.needsOnboarding) return;
      setMembers(
        res.members.filter(
          (m) =>
            m.status === "active" &&
            !m.is_deceased &&
            !m.is_placeholder &&
            !m.blocked_at
        )
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const onSubmit = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError("Name is required.");
      return;
    }
    if (isMinor && isDeceased) {
      setError("Pick either minor or in-memoriam, not both.");
      return;
    }
    setSubmitting(true);
    try {
      await addPlaceholder({
        displayName: displayName.trim(),
        relationshipLabel: relationship.trim() || undefined,
        isDeceased,
        isMinor,
        managedByMembershipId: managedBy ?? undefined,
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
          onToggle={() => {
            setIsDeceased((v) => !v);
            if (!isDeceased) setIsMinor(false);
          }}
        />
        <Toggle
          label="Minor (managed profile)"
          subtitle="A child whose profile is managed by another family member"
          checked={isMinor}
          onToggle={() => {
            setIsMinor((v) => !v);
            if (!isMinor) setIsDeceased(false);
          }}
        />
        {isMinor ? (
          <>
            <Text style={styles.fieldLabel}>Managed by</Text>
            <View style={styles.chipRow}>
              {members.map((m) => (
                <Pressable
                  key={m.id}
                  style={[
                    styles.chip,
                    managedBy === m.id && styles.chipOn,
                  ]}
                  onPress={() =>
                    setManagedBy(managedBy === m.id ? null : m.id)
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      managedBy === m.id && styles.chipTextOn,
                    ]}
                  >
                    {m.display_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
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
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSubtle,
  },
  chipRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.text, fontWeight: fontWeight.medium },
  chipTextOn: { color: colors.primaryText },
  error: { fontSize: fontSize.sm, color: colors.danger, textAlign: "center" },
});
