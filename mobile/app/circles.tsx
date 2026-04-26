import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { ListItem, SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import { fetchCircles, setActiveCircle } from "@/lib/circles";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import type { CircleSummary } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; circles: CircleSummary[] };

export default function CirclesScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchCircles();
      setState({ kind: "ok", circles: res.circles });
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load";
      setState({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onSwitch = async (circle: CircleSummary) => {
    if (circle.active) {
      router.back();
      return;
    }
    setBusy(circle.circleId);
    try {
      await setActiveCircle(circle.circleId);
      router.replace("/");
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't switch");
      setBusy(null);
    }
  };

  if (state.kind === "loading") {
    return (
      <Screen scroll={false}>
        <EmptyState title="Loading…" />
      </Screen>
    );
  }
  if (state.kind === "error") {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="Couldn't load circles"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Switch</Text>
        <Text style={styles.title}>Family circles</Text>
        <Text style={styles.lede}>
          You belong to {state.circles.length}{" "}
          {state.circles.length === 1 ? "circle" : "circles"}. Tap to switch.
        </Text>
      </View>

      <Card>
        <SectionHeader title="Your circles" />
        <View style={{ gap: spacing.sm }}>
          {state.circles.map((c) => (
            <ListItem
              key={c.circleId}
              title={c.name}
              subtitle={
                c.description ?? `${c.role === "owner" ? "Owner" : "Member"}`
              }
              trailing={
                c.active ? (
                  <Badge tone="success" label="Active" />
                ) : busy === c.circleId ? (
                  <Badge label="…" />
                ) : null
              }
              onPress={() => void onSwitch(c)}
            />
          ))}
        </View>
      </Card>
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
});
