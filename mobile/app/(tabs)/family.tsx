import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { ListItem, SectionHeader } from "@/components/ListItem";
import { EmptyState } from "@/components/EmptyState";
import { ApiError } from "@/lib/api";
import { fetchFamilyMembers } from "@/lib/family";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import type { FamilyMember } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "needs-onboarding" }
  | {
      kind: "ok";
      circleName: string;
      viewerMembershipId: string;
      viewerRole: "owner" | "member";
      members: FamilyMember[];
    };

function memberBadge(m: FamilyMember) {
  if (m.is_deceased) return <Badge tone="neutral" label="In memoriam" />;
  if (m.blocked_at) return <Badge tone="danger" label="Blocked" />;
  if (m.is_placeholder) return <Badge tone="warning" label="Placeholder" />;
  if (m.role === "owner") return <Badge tone="success" label="Owner" />;
  if (m.status === "active") return <Badge tone="success" label="Joined" />;
  return <Badge tone="neutral" label="Invited" />;
}

export default function FamilyTab() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchFamilyMembers();
      if (res.needsOnboarding) {
        setState({ kind: "needs-onboarding" });
        return;
      }
      setState({
        kind: "ok",
        circleName: res.circle.name,
        viewerMembershipId: res.viewerMembershipId,
        viewerRole: res.viewerRole,
        members: res.members,
      });
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load family";
      setState({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Reload when returning from a child screen.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

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
        <EmptyState
          title="Couldn't load family"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }
  if (state.kind === "needs-onboarding") {
    return (
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Family</Text>
          <Text style={styles.title}>Start your circle</Text>
          <Text style={styles.lede}>
            A family circle is a private space for the people you call.
          </Text>
        </View>
        <Card>
          <Button label="Create circle" onPress={() => router.push("/onboarding")} />
        </Card>
      </Screen>
    );
  }

  const isOwner = state.viewerRole === "owner";
  const sortedMembers = [...state.members].sort((a, b) => {
    const score = (m: FamilyMember) =>
      m.role === "owner" ? 0 : m.is_deceased ? 5 : m.blocked_at ? 4 : m.is_placeholder ? 3 : m.status === "active" ? 1 : 2;
    return score(a) - score(b);
  });

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Family</Text>
        <Text style={styles.title}>{state.circleName}</Text>
        <Text style={styles.lede}>
          {state.members.length}{" "}
          {state.members.length === 1 ? "person" : "people"} in your circle.
        </Text>
      </View>

      {isOwner ? (
        <Card>
          <SectionHeader title="Add to the circle" />
          <Button
            label="Invite by email"
            onPress={() => router.push("/family/invite")}
          />
          <Button
            label="Add placeholder member"
            variant="secondary"
            onPress={() => router.push("/family/placeholder")}
          />
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="Members" />
        <View style={{ gap: spacing.sm }}>
          {sortedMembers.map((m) => (
            <ListItem
              key={m.id}
              title={m.display_name}
              subtitle={
                m.relationship_label ??
                m.invite_email ??
                m.phone_number ??
                undefined
              }
              trailing={memberBadge(m)}
              onPress={() => router.push(`/family/${m.id}`)}
            />
          ))}
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
