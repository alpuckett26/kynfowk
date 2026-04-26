import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { admin } from "@/lib/admin";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type {
  AdminUserDetail,
  AutoScheduleProposal,
  AutoScheduleRunResponse,
} from "@/types/admin";

export default function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [proposalsModal, setProposalsModal] = useState<
    AutoScheduleRunResponse | null
  >(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Time-travel state
  const [ttA, setTtA] = useState("");
  const [ttB, setTtB] = useState("");
  const [ttDays, setTtDays] = useState("8");

  const load = async () => {
    if (!id) return;
    try {
      setData(await admin.getUser(id));
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const wrap = async <T,>(kind: string, fn: () => Promise<T>): Promise<T | null> => {
    setBusy(kind);
    try {
      return await fn();
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  };

  if (!id) return null;
  if (!data) {
    return (
      <Screen>
        <Text style={styles.meta}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Text style={styles.h1}>{data.profile.full_name ?? "(no name)"}</Text>
      <Text style={styles.meta}>{data.profile.email ?? "(no email)"}</Text>
      <Text style={styles.metaSm}>
        Timezone {data.profile.timezone} · joined{" "}
        {new Date(data.profile.created_at).toLocaleDateString()}
      </Text>

      <Card>
        <Text style={styles.h2}>Auto-schedule consent</Text>
        <Text style={styles.metaSm}>
          enabled: {String(data.profile.auto_schedule_enabled)} · max/week:{" "}
          {data.profile.auto_schedule_max_per_week} · paused until:{" "}
          {data.profile.auto_schedule_paused_until ?? "—"}
        </Text>
      </Card>

      <Card>
        <Text style={styles.h2}>Memberships ({data.memberships.length})</Text>
        {data.memberships.map((m) => (
          <View key={m.id} style={styles.row}>
            <Text style={styles.rowTitle}>
              {m.family_circles?.name ?? "(unknown circle)"}
            </Text>
            <Text style={styles.rowMeta}>
              as {m.display_name} · {m.role} · {m.status}
              {m.is_minor ? " · minor" : ""}
            </Text>
            <Text style={styles.rowMetaCode}>id: {m.id}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={styles.h2}>Run auto-schedule</Text>
        <Button
          label="Dry run (preview only)"
          onPress={async () => {
            const r = await wrap("dry-run", () =>
              admin.runAutoSchedule({ userId: id, dryRun: true })
            );
            if (r) setProposalsModal(r);
          }}
          loading={busy === "dry-run"}
        />
        <Button
          label="Commit (insert calls)"
          variant="secondary"
          onPress={async () => {
            const r = await wrap("commit", () =>
              admin.runAutoSchedule({ userId: id, dryRun: false })
            );
            if (r) {
              Alert.alert(
                "Done",
                `Scheduled: ${r.aggregate.scheduled} · attempted: ${r.aggregate.attempted}`
              );
              await load();
            }
          }}
          loading={busy === "commit"}
        />
        <Button
          label="Reset auto-scheduled calls"
          variant="danger"
          onPress={async () => {
            const r = await wrap("reset", () =>
              admin.resetAutoSchedule({ userId: id })
            );
            if (r) {
              Alert.alert("Reset", `${r.canceled} call(s) canceled.`);
              await load();
            }
          }}
          loading={busy === "reset"}
        />
      </Card>

      <Card>
        <Text style={styles.h2}>Time-travel last connection</Text>
        <Text style={styles.metaSm}>
          Paste two membership IDs from above + days ago. Existing call gets
          shifted; if none exists, a synthetic completed call is inserted.
        </Text>
        <Input
          label="Membership A"
          value={ttA}
          onChangeText={setTtA}
          placeholder="uuid"
          autoCapitalize="none"
        />
        <Input
          label="Membership B"
          value={ttB}
          onChangeText={setTtB}
          placeholder="uuid"
          autoCapitalize="none"
        />
        <Input
          label="Days ago"
          value={ttDays}
          onChangeText={setTtDays}
          keyboardType="numeric"
          numeric
        />
        <Button
          label="Time-travel"
          onPress={async () => {
            const days = Number.parseInt(ttDays, 10);
            if (!ttA || !ttB || !Number.isFinite(days)) {
              Alert.alert("Required", "Both ids + days needed.");
              return;
            }
            const r = await wrap("time-travel", () =>
              admin.timeTravel({
                membershipA: ttA,
                membershipB: ttB,
                daysAgo: days,
              })
            );
            if (r) {
              Alert.alert(
                "Time-travel",
                `mode=${r.mode} call=${r.callId}`
              );
            }
          }}
          loading={busy === "time-travel"}
        />
      </Card>

      <Card>
        <Text style={styles.h2}>Promote / demote</Text>
        <Text style={styles.metaSm}>
          Currently: {data.profile.is_super_admin ? "super admin" : "regular user"}
        </Text>
        <Button
          label={
            data.profile.is_super_admin
              ? "Demote from super admin"
              : "Promote to super admin"
          }
          variant={data.profile.is_super_admin ? "danger" : "primary"}
          onPress={async () => {
            const r = await wrap("promote", () =>
              admin.promoteUser(id, !data.profile.is_super_admin)
            );
            if (r) await load();
          }}
          loading={busy === "promote"}
        />
      </Card>

      <Card>
        <Text style={styles.h2}>Impersonate</Text>
        <Text style={styles.metaSm}>
          Returns a magic-link action_link for the target. Open in a browser
          to land in their session. Original session must be re-established
          via /login afterward.
        </Text>
        <Button
          label="Generate impersonation link"
          variant="secondary"
          onPress={async () => {
            const r = await wrap("impersonate", () =>
              admin.impersonateStart(id)
            );
            if (r) {
              Alert.alert(
                "Impersonation link",
                r.actionLink ?? "(none — check Supabase logs)"
              );
            }
          }}
          loading={busy === "impersonate"}
        />
      </Card>

      <ProposalsModal
        result={proposalsModal}
        onClose={() => setProposalsModal(null)}
      />
    </Screen>
  );
}

function ProposalsModal({
  result,
  onClose,
}: {
  result: AutoScheduleRunResponse | null;
  onClose: () => void;
}) {
  if (!result) return null;
  const proposals: AutoScheduleProposal[] = (result.perUser ?? []).flatMap(
    (u) => u.proposals ?? []
  );
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Text style={styles.h1}>Dry-run proposals</Text>
        <Text style={styles.metaSm}>
          {result.aggregate.scheduled} would be scheduled · attempted{" "}
          {result.aggregate.attempted} · cooldown {result.aggregate.skippedByCooldown} ·
          no-overlap {result.aggregate.skippedByNoOverlap} · cap{" "}
          {result.aggregate.skippedByCap} · minor-parent{" "}
          {result.aggregate.skippedByMinorParent}
        </Text>
        <ScrollView style={styles.modalScroll} contentContainerStyle={{ gap: spacing.md }}>
          {proposals.map((p, i) => (
            <View key={`${p.selfMembershipId}-${p.kinMembershipId}-${i}`} style={styles.proposalCard}>
              <Text style={styles.rowTitle}>
                {p.selfDisplayName} ↔ {p.kinDisplayName}
              </Text>
              <Text style={styles.rowMeta}>
                tier {p.tier} · {new Date(p.scheduledStart).toLocaleString()}
              </Text>
              <Text style={styles.rowMetaCode}>
                participants: {p.participantMembershipIds.length}
              </Text>
            </View>
          ))}
          {proposals.length === 0 ? (
            <Text style={styles.meta}>
              No proposals returned (cooldown, cap, or no overlap).
            </Text>
          ) : null}
        </ScrollView>
        <Button label="Close" onPress={onClose} variant="secondary" />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.text },
  h2: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textMuted },
  metaSm: { fontSize: fontSize.xs, color: colors.textSubtle },
  row: { gap: 2, paddingVertical: spacing.xs },
  rowTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  rowMeta: { fontSize: fontSize.xs, color: colors.textSubtle },
  rowMetaCode: { fontSize: 10, color: colors.textSubtle, fontFamily: "Courier" },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  modalScroll: { flex: 1 },
  proposalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
});
