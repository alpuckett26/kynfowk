import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import { fetchFamilyMembers } from "@/lib/family";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type { FamilyMember } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "needs-onboarding" }
  | {
      kind: "ok";
      circleName: string;
      members: FamilyMember[];
    };

export default function PhonebookScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchFamilyMembers();
      if (res.needsOnboarding) {
        setState({ kind: "needs-onboarding" });
        return;
      }
      const visible = res.members
        .filter(
          (m) => !m.blocked_at && !m.is_deceased && !m.is_placeholder
        )
        .sort((a, b) => a.display_name.localeCompare(b.display_name));
      setState({
        kind: "ok",
        circleName: res.circle.name,
        members: visible,
      });
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load phonebook";
      setState({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (state.kind === "loading") {
    return (
      <Screen scroll={false}>
        <EmptyState title="Loading…" />
      </Screen>
    );
  }
  if (state.kind === "error") {
    return (
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="Couldn't load phonebook"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }
  if (state.kind === "needs-onboarding") {
    return (
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="No circle yet"
          description="Create a family circle to see contact info here."
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{state.circleName}</Text>
        <Text style={styles.title}>Phonebook</Text>
        <Text style={styles.lede}>
          Tap a row to call, email, or open the address.
        </Text>
      </View>

      {state.members.length === 0 ? (
        <Card>
          <EmptyState
            title="No contacts to show"
            description="Add family members from the Family tab."
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {state.members.map((m) => (
            <ContactCard key={m.id} member={m} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function ContactCard({ member }: { member: FamilyMember }) {
  const phone = member.phone_number?.trim();
  const email = member.invite_email?.trim();
  const address = member.address?.trim();

  return (
    <Card>
      <Text style={styles.cardTitle}>{member.display_name}</Text>
      {member.relationship_label ? (
        <Text style={styles.cardSubtitle}>{member.relationship_label}</Text>
      ) : null}

      {phone ? (
        <ContactRow
          label="Phone"
          value={phone}
          onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`)}
        />
      ) : null}
      {email ? (
        <ContactRow
          label="Email"
          value={email}
          onPress={() => void Linking.openURL(`mailto:${email}`)}
        />
      ) : null}
      {address ? (
        <ContactRow
          label="Address"
          value={address}
          onPress={() =>
            void Linking.openURL(
              `geo:0,0?q=${encodeURIComponent(address)}`
            ).catch(() =>
              Linking.openURL(
                `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
              )
            )
          }
        />
      ) : null}

      {!phone && !email && !address ? (
        <Text style={styles.emptyMeta}>
          No contact info yet. Add it from the member detail page.
        </Text>
      ) : null}
    </Card>
  );
}

function ContactRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}
      onPress={onPress}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </Pressable>
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
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  cardSubtitle: { fontSize: fontSize.sm, color: colors.textMuted },
  row: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 2,
  },
  rowLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSubtle,
  },
  rowValue: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  emptyMeta: { fontSize: fontSize.sm, color: colors.textMuted },
});
