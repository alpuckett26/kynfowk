import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { ListItem, SectionHeader } from "@/components/ListItem";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { StatGrid, StatTile } from "@/components/StatTile";
import { HighlightCard } from "@/components/HighlightCard";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import { formatDate, formatTime, relativeTime } from "@/lib/format";
import { fetchDashboard } from "@/lib/dashboard";
import { fetchAiSuggestion } from "@/lib/ai";
import { ApiError } from "@/lib/api";
import type {
  AiSuggestion,
  DashboardSnapshot,
  DashboardUpcomingCall,
  Suggestion,
} from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "needs-onboarding"; email: string | null }
  | { kind: "error"; message: string }
  | { kind: "ok"; snapshot: DashboardSnapshot };

export default function HomeScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchDashboard();
      if (res.needsOnboarding) {
        setState({ kind: "needs-onboarding", email: null });
        return;
      }
      setState({ kind: "ok", snapshot: res.snapshot });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Couldn't load dashboard";
      setState({ kind: "error", message });
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
        <EmptyState title="Loading…" description="Pulling your family's latest." />
      </Screen>
    );
  }

  if (state.kind === "error") {
    return (
      <Screen onRefresh={onRefresh} refreshing={refreshing}>
        <EmptyState
          title="Couldn't load the dashboard"
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
          <Text style={styles.eyebrow}>Welcome</Text>
          <Text style={styles.title}>Kynfowk</Text>
        </View>
        <EmptyState
          title="You aren't part of a family circle yet"
          description="Finish onboarding at kynfowk.vercel.app — in-app onboarding lands in M12."
        />
      </Screen>
    );
  }

  const snap = state.snapshot;

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{snap.circle.name}</Text>
        <Text style={styles.title}>Keep your rhythm in view</Text>
        {snap.circle.description ? (
          <Text style={styles.lede}>{snap.circle.description}</Text>
        ) : null}
      </View>

      <Card>
        <Text style={styles.cardLabel}>Family circle readiness</Text>
        <Text style={styles.bigStat}>{snap.readiness.completionRate}% ready</Text>
        <Text style={styles.cardMeta}>
          {snap.readiness.withAvailability} of {snap.readiness.activeMembers} active
          members have availability shared
          {snap.readiness.invitedMembers > 0
            ? `. ${snap.readiness.invitedMembers} invited member${snap.readiness.invitedMembers === 1 ? "" : "s"} pending.`
            : "."}
        </Text>
        <View style={styles.pillRow}>
          <Badge label={`${snap.upcomingCalls.length} upcoming`} />
          <Badge label={`${snap.stats.completedCalls} completed`} />
        </View>
      </Card>

      <StatGrid>
        <StatTile label="Connection score" value={snap.stats.connectionScore} />
        <StatTile label="Time together" value={`${snap.stats.totalMinutes} min`} />
        <StatTile
          label="This week"
          value={snap.stats.uniqueConnectedThisWeek}
          hint="people connected"
        />
        <StatTile
          label="Weekly streak"
          value={snap.stats.weeklyStreak}
          hint={snap.stats.weeklyStreak === 1 ? "week" : "weeks"}
        />
      </StatGrid>

      {snap.highlights.length > 0 ? (
        <View style={styles.highlights}>
          {snap.highlights.map((h, i) => (
            <HighlightCard key={`${h.title}-${i}`} highlight={h} />
          ))}
        </View>
      ) : null}

      <Card>
        <SectionHeader
          title="Upcoming"
          action={
            <Button
              label="Schedule"
              variant="ghost"
              onPress={() => router.push("/schedule")}
            />
          }
        />
        {snap.upcomingCalls.length === 0 ? (
          <EmptyState
            title="No call on the books yet"
            description="Use the suggestions below to protect your next moment."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {snap.upcomingCalls.map((call) => (
              <UpcomingCallRow
                key={call.id}
                call={call}
                onPress={() => router.push(`/calls/${call.id}`)}
              />
            ))}
          </View>
        )}
      </Card>

      <Card>
        <SectionHeader title="Best times to connect" />
        {snap.suggestions.length === 0 ? (
          <EmptyState
            title="Need more overlap"
            description="Get two members' availability into the system and shared windows will appear."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {snap.suggestions.slice(0, 3).map((s) => (
              <SuggestionRow key={s.start_at} suggestion={s} />
            ))}
          </View>
        )}
      </Card>

      <AiSuggestionCard />


      <Card>
        <SectionHeader title="Recently completed" />
        {snap.completedCalls.length === 0 ? (
          <EmptyState
            title="No completed calls yet"
            description="Once a call wraps, it shows up here as a memory."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {snap.completedCalls.map((c) => (
              <ListItem
                key={c.id}
                title={c.title}
                meta={`${formatDate(c.scheduled_start)} · ${c.attended_count} joined`}
                trailing={
                  <Badge
                    tone="success"
                    label={`${c.actual_duration_minutes ?? 0} min`}
                  />
                }
                onPress={() => router.push(`/calls/${c.id}`)}
              />
            ))}
          </View>
        )}
      </Card>

      {snap.latestRecap ? (
        <Card>
          <SectionHeader title="Latest recap" />
          <Text style={styles.recapTitle}>{snap.latestRecap.title}</Text>
          <Text style={styles.cardMeta}>
            {formatDate(snap.latestRecap.scheduledStart)} ·{" "}
            {snap.latestRecap.actualDurationMinutes} min
          </Text>
          {snap.latestRecap.highlight ? (
            <View style={styles.recapBlock}>
              <Text style={styles.recapLabel}>Highlight</Text>
              <Text style={styles.recapText}>{snap.latestRecap.highlight}</Text>
            </View>
          ) : null}
          {snap.latestRecap.summary ? (
            <View style={styles.recapBlock}>
              <Text style={styles.recapLabel}>Summary</Text>
              <Text style={styles.recapText}>{snap.latestRecap.summary}</Text>
            </View>
          ) : null}
          {snap.latestRecap.nextStep ? (
            <View style={styles.recapBlock}>
              <Text style={styles.recapLabel}>Next step</Text>
              <Text style={styles.recapText}>{snap.latestRecap.nextStep}</Text>
            </View>
          ) : null}
          {!snap.latestRecap.summary && !snap.latestRecap.highlight && !snap.latestRecap.nextStep ? (
            <Text style={styles.cardMeta}>
              Recap waiting to be filled in. Open the call to add notes.
            </Text>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="Inbox" />
        {snap.inbox.notifications.length === 0 ? (
          <EmptyState
            title="All caught up"
            description="Reminders and recap nudges will land here."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {snap.inbox.notifications.map((n) => (
              <ListItem
                key={n.id}
                title={n.title}
                subtitle={n.body}
                meta={relativeTime(n.createdAt)}
                trailing={n.readAt ? null : <Badge tone="warning" label="New" />}
              />
            ))}
            {snap.inbox.unreadCount > snap.inbox.notifications.length ? (
              <Text style={styles.cardMeta}>
                {snap.inbox.unreadCount - snap.inbox.notifications.length} more unread
              </Text>
            ) : null}
          </View>
        )}
      </Card>

      <Card>
        <SectionHeader
          title="Recent activity"
          action={
            <Button
              label="See all"
              variant="ghost"
              onPress={() => router.push("/activity")}
            />
          }
        />
        {snap.recentActivity.length === 0 ? (
          <EmptyState
            title="Activity will land here"
            description="Invites, scheduled calls, and saved recaps build a timeline for your circle."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {snap.recentActivity.slice(0, 5).map((item) => (
              <ListItem
                key={item.id}
                title={item.summary}
                meta={relativeTime(item.createdAt)}
              />
            ))}
          </View>
        )}
      </Card>

      <Card>
        <SectionHeader title="Family extras" />
        <Button
          label="Photo reel"
          variant="secondary"
          onPress={() => router.push("/photos")}
        />
        <Button
          label="This-or-that polls"
          variant="secondary"
          onPress={() => router.push("/polls")}
        />
        <Button
          label="Family prompts"
          variant="secondary"
          onPress={() => router.push("/prompts")}
        />
      </Card>

      <Card>
        <SectionHeader title="Family members" />
        {snap.memberships.length === 0 ? (
          <EmptyState title="No family members added yet" />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {snap.memberships.slice(0, 6).map((m) => (
              <ListItem
                key={m.id}
                title={m.display_name}
                subtitle={m.invite_email ?? undefined}
                trailing={
                  <Badge
                    tone={m.status === "active" ? "success" : "neutral"}
                    label={m.status === "active" ? "Joined" : "Invited"}
                  />
                }
              />
            ))}
            {snap.memberships.length > 6 ? (
              <Text style={styles.cardMeta}>
                +{snap.memberships.length - 6} more in Family tab
              </Text>
            ) : null}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function UpcomingCallRow({
  call,
  onPress,
}: {
  call: DashboardUpcomingCall;
  onPress: () => void;
}) {
  const start = new Date(call.scheduled_start);
  const end = new Date(call.scheduled_end);
  const isLive = call.status === "live" || !!call.actual_started_at;
  const needsRecovery = call.show_recovery_prompt;
  return (
    <ListItem
      title={call.title}
      subtitle={`${formatDate(start.toISOString())} · ${formatTime(start.toISOString())} – ${formatTime(end.toISOString())}`}
      meta={call.reminder_label}
      trailing={
        isLive ? (
          <Badge tone="live" label="Live" />
        ) : needsRecovery ? (
          <Badge tone="warning" label="Follow up" />
        ) : (
          <Badge label="Scheduled" />
        )
      }
      onPress={onPress}
    />
  );
}

function AiSuggestionCard() {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; suggestion: AiSuggestion | null }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const fetch = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetchAiSuggestion();
      setState({ kind: "ok", suggestion: res.suggestion });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't reach Kyn";
      setState({ kind: "error", message });
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return (
    <Card>
      <View style={styles.aiHead}>
        <SectionHeader title="Kyn says" />
        {state.kind === "ok" && state.suggestion?.isAI ? (
          <Badge label="AI" />
        ) : null}
      </View>
      {state.kind === "loading" || state.kind === "idle" ? (
        <Text style={styles.cardMeta}>Kyn is thinking…</Text>
      ) : state.kind === "error" ? (
        <Text style={styles.cardMeta}>{state.message}</Text>
      ) : !state.suggestion ? (
        <Text style={styles.cardMeta}>
          Add a few family members and complete a call so Kyn can recommend
          who to connect with next.
        </Text>
      ) : (
        <View style={{ gap: spacing.xs }}>
          <Text style={styles.aiFocus}>{state.suggestion.focus}</Text>
          <Text style={styles.cardMeta}>{state.suggestion.reason}</Text>
          {state.suggestion.participantNames.length > 0 ? (
            <Text style={styles.cardMeta}>
              Suggested: {state.suggestion.participantNames.join(", ")}
            </Text>
          ) : null}
        </View>
      )}
      <Button
        label={state.kind === "loading" ? "Refreshing…" : "Get a new suggestion"}
        variant="ghost"
        onPress={fetch}
        loading={state.kind === "loading"}
      />
    </Card>
  );
}

function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const start = new Date(suggestion.start_at);
  const end = new Date(suggestion.end_at);
  return (
    <View style={styles.suggestionBox}>
      <View style={styles.suggestionHead}>
        <Text style={styles.suggestionTitle}>{suggestion.label}</Text>
        <Badge label={suggestion.overlap_strength_label} />
      </View>
      <Text style={styles.cardMeta}>
        {formatDate(start.toISOString())} · {formatTime(start.toISOString())} – {formatTime(end.toISOString())}
      </Text>
      <Text style={styles.cardMeta}>{suggestion.rationale}</Text>
      <Text style={styles.cardMeta}>
        Family-ready: {suggestion.participant_names.slice(0, 4).join(", ")}
        {suggestion.participant_count > 4
          ? ` and ${suggestion.participant_count - 4} more`
          : ""}
      </Text>
    </View>
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
  lede: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  cardLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSubtle,
  },
  bigStat: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  cardMeta: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 19 },
  pillRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    marginTop: spacing.xs,
  },
  highlights: { gap: spacing.sm },
  recapTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  recapBlock: { gap: 2 },
  recapLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.accent,
  },
  recapText: { fontSize: fontSize.sm, color: colors.text, lineHeight: 19 },
  suggestionBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: spacing.md,
    gap: 4,
  },
  suggestionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  suggestionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  aiHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiFocus: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
