import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { ListItem, SectionHeader } from "@/components/ListItem";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import { formatDate, formatTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";

type UpcomingCall = {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
};

type State =
  | { kind: "loading" }
  | { kind: "no-family"; email: string }
  | {
      kind: "ok";
      email: string;
      circleName: string;
      circleId: string;
      upcoming: UpcomingCall[];
      error: string | null;
    };

export default function HomeScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: membership } = await supabase
      .from("family_memberships")
      .select("family_circle_id, family_circles(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{
        family_circle_id: string;
        family_circles: { name: string } | null;
      }>();

    if (!membership?.family_circle_id) {
      setState({ kind: "no-family", email: user.email ?? "" });
      return;
    }

    const { data: calls, error } = await supabase
      .from("call_sessions")
      .select("id, title, scheduled_start, scheduled_end, status")
      .eq("family_circle_id", membership.family_circle_id)
      .in("status", ["scheduled", "live", "in_progress"])
      .gte("scheduled_end", new Date().toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(5);

    setState({
      kind: "ok",
      email: user.email ?? "",
      circleName: membership.family_circles?.name ?? "Your circle",
      circleId: membership.family_circle_id,
      upcoming: (calls ?? []) as UpcomingCall[],
      error: error?.message ?? null,
    });
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
    return <Screen scroll={false}><EmptyState title="Loading…" /></Screen>;
  }

  if (state.kind === "no-family") {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Welcome</Text>
          <Text style={styles.title}>Kynfowk</Text>
          <Text style={styles.muted}>{state.email}</Text>
        </View>
        <EmptyState
          title="You aren't part of a family circle yet"
          description="Finish setup at kynfowk.vercel.app — onboarding from the app is coming in a later milestone."
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Family circle</Text>
        <Text style={styles.title}>{state.circleName}</Text>
      </View>

      <Card>
        <SectionHeader title="Upcoming" />
        {state.error ? (
          <Card style={styles.errorCard} padded={false}>
            <Text style={styles.errorText}>Couldn't load calls: {state.error}</Text>
          </Card>
        ) : state.upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming calls"
            description="Schedule a call from the Schedule tab to see it here."
            action={
              <Button
                label="Schedule a call"
                variant="secondary"
                onPress={() => router.push("/schedule")}
              />
            }
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {state.upcoming.map((call) => {
              const start = new Date(call.scheduled_start);
              const isLive =
                call.status === "live" || call.status === "in_progress";
              return (
                <ListItem
                  key={call.id}
                  title={call.title}
                  meta={`${formatDate(start.toISOString())} · ${formatTime(start.toISOString())}`}
                  trailing={isLive ? <Badge label="Live" tone="live" /> : <Badge label="Scheduled" />}
                  onPress={() => {}}
                />
              );
            })}
          </View>
        )}
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
  muted: { color: colors.textSubtle, fontSize: fontSize.sm },
  errorCard: {
    backgroundColor: colors.dangerBg,
    borderColor: colors.danger,
    padding: spacing.md,
  },
  errorText: { color: colors.danger, fontSize: fontSize.sm },
});
