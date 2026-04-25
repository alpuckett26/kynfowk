import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { SectionHeader } from "@/components/ListItem";
import { inviteMember } from "@/lib/family";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";

export default function InviteMemberScreen() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setMessage(null);
    if (!displayName.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await inviteMember({
        displayName: displayName.trim(),
        inviteEmail: email.trim(),
        relationshipLabel: relationship.trim() || undefined,
      });
      setMessage(
        res.alreadyClaimed
          ? "Added — but that email already has an account, so they may need to sign in instead of accepting an invite."
          : "Invite sent. They'll get an email with a link to join."
      );
      setDisplayName("");
      setEmail("");
      setRelationship("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send invite");
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
        <Text style={styles.eyebrow}>Invite</Text>
        <Text style={styles.title}>Add to the circle</Text>
      </View>
      <Card>
        <SectionHeader title="Their details" />
        <Input
          label="Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Aunt Marie"
        />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="aunt.marie@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Relationship (optional)"
          value={relationship}
          onChangeText={setRelationship}
          placeholder="Aunt, sister, grandparent…"
        />
      </Card>
      <Button
        label={submitting ? "Sending…" : "Send invite"}
        onPress={onSubmit}
        loading={submitting}
      />
      {message ? <Text style={styles.success}>{message}</Text> : null}
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
  success: { fontSize: fontSize.sm, color: colors.success, textAlign: "center" },
  error: { fontSize: fontSize.sm, color: colors.danger, textAlign: "center" },
});
