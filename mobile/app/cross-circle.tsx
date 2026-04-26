import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { ListItem, SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import {
  approveCrossCircleLink,
  createCrossCircleLink,
  declineCrossCircleLink,
  deleteCrossCircleLink,
  fetchCrossCircleLinks,
} from "@/lib/cross-circle";
import { fetchCircles } from "@/lib/circles";
import { fetchFamilyMembers } from "@/lib/family";
import { fetchRelationships } from "@/lib/relationships";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type {
  CircleSummary,
  CrossCircleLinkRow,
  CrossCircleMember,
  RelationshipKind,
} from "@/types/api";

const KIND_OPTIONS: { value: RelationshipKind | string; label: string }[] = [
  { value: "cousin", label: "Cousin" },
  { value: "aunt", label: "Aunt" },
  { value: "uncle", label: "Uncle" },
  { value: "niece", label: "Niece" },
  { value: "nephew", label: "Nephew" },
  { value: "grandparent", label: "Grandparent" },
  { value: "grandchild", label: "Grandchild" },
  { value: "great_grandparent", label: "Great-grandparent" },
  { value: "great_grandchild", label: "Great-grandchild" },
  { value: "in_law", label: "In-law" },
  { value: "step_parent", label: "Step-parent" },
  { value: "step_child", label: "Step-child" },
  { value: "other", label: "Other" },
];

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      links: CrossCircleLinkRow[];
      members: CrossCircleMember[];
      myCircles: CircleSummary[];
      mySourceMembershipIds: string[];
    };

export default function CrossCircleScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const [linksRes, circlesRes, membersRes, relsRes] = await Promise.all([
        fetchCrossCircleLinks(),
        fetchCircles(),
        fetchFamilyMembers(),
        fetchRelationships(),
      ]);

      const ownedSourceIds: string[] = [];
      // The active circle's membership id is what we use as the "source"
      // when the viewer creates a new link.
      if (!membersRes.needsOnboarding) {
        ownedSourceIds.push(membersRes.viewerMembershipId);
      }
      // Also include relationship-graph viewer membership in case it differs.
      if (!("needsOnboarding" in relsRes && relsRes.needsOnboarding === true)) {
        const snap = relsRes;
        if (
          "viewerMembershipId" in snap &&
          snap.viewerMembershipId &&
          !ownedSourceIds.includes(snap.viewerMembershipId)
        ) {
          ownedSourceIds.push(snap.viewerMembershipId);
        }
      }

      setState({
        kind: "ok",
        links: linksRes.links,
        members: linksRes.members,
        myCircles: circlesRes.circles,
        mySourceMembershipIds: ownedSourceIds,
      });
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
          title="Couldn't load"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  const memberById = new Map(state.members.map((m) => [m.id, m]));
  const pending = state.links.filter((l) => l.status === "pending");
  const active = state.links.filter((l) => l.status === "active");

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Across circles</Text>
        <Text style={styles.title}>Cross-circle relationships</Text>
        <Text style={styles.lede}>
          Link cousins, aunts, uncles in other family circles so the
          auto-scheduler can keep extended family on the calendar.
        </Text>
      </View>

      <CreateLinkForm
        myCircles={state.myCircles}
        mySourceMembershipIds={state.mySourceMembershipIds}
        onCreated={() => void load()}
      />

      {pending.length > 0 ? (
        <Card>
          <SectionHeader title={`Pending · ${pending.length}`} />
          <View style={{ gap: spacing.sm }}>
            {pending.map((link) => (
              <PendingLinkRow
                key={link.id}
                link={link}
                memberById={memberById}
                onChanged={() => void load()}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <SectionHeader title={`Active · ${active.length}`} />
        {active.length === 0 ? (
          <EmptyState
            title="No active links yet"
            description="Use the form above to start one."
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {active.map((link) => (
              <ActiveLinkRow
                key={link.id}
                link={link}
                memberById={memberById}
                mySourceMembershipIds={state.mySourceMembershipIds}
                onDeleted={() => void load()}
              />
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function CreateLinkForm({
  myCircles,
  mySourceMembershipIds,
  onCreated,
}: {
  myCircles: CircleSummary[];
  mySourceMembershipIds: string[];
  onCreated: () => void;
}) {
  const [pickedCircleId, setPickedCircleId] = useState<string | null>(null);
  const [pickedTargetId, setPickedTargetId] = useState<string | null>(null);
  const [pickedKind, setPickedKind] = useState<string>("cousin");
  const [members, setMembers] = useState<
    Array<{ id: string; display_name: string }>
  >([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const otherCircles = useMemo(
    () => myCircles.filter((c) => !c.active),
    [myCircles]
  );

  // Note: we don't have an endpoint to list members of a circle the viewer
  // isn't currently active in. For v1, guidance: the viewer must switch
  // active circle to the target side first to learn member ids, OR the
  // target circle's owner can initiate from their side. We surface that
  // hint here.
  const onPickCircle = (circleId: string) => {
    setPickedCircleId(pickedCircleId === circleId ? null : circleId);
    setPickedTargetId(null);
    setMembers([]);
  };

  const onSubmit = async () => {
    setMessage(null);
    if (mySourceMembershipIds.length === 0) {
      setMessage("Set up a circle first.");
      return;
    }
    if (!pickedTargetId) {
      setMessage("Pick the target member id.");
      return;
    }
    setSaving(true);
    try {
      await createCrossCircleLink({
        sourceMembershipId: mySourceMembershipIds[0],
        targetMembershipId: pickedTargetId,
        kind: pickedKind,
      });
      setPickedCircleId(null);
      setPickedTargetId(null);
      setMembers([]);
      onCreated();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Add a cross-circle link" />
      {otherCircles.length === 0 ? (
        <Text style={styles.subtle}>
          You only belong to one circle right now. Cross-circle links help
          when you're a member of multiple circles or when another circle's
          owner sends a request.
        </Text>
      ) : (
        <>
          <Text style={styles.fieldLabel}>Other circle</Text>
          <View style={styles.chipRow}>
            {otherCircles.map((c) => (
              <Pressable
                key={c.circleId}
                onPress={() => onPickCircle(c.circleId)}
                style={[
                  styles.chip,
                  pickedCircleId === c.circleId && styles.chipOn,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    pickedCircleId === c.circleId && styles.chipTextOn,
                  ]}
                >
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.fieldLabel}>Kind</Text>
      <View style={styles.chipRow}>
        {KIND_OPTIONS.map((k) => (
          <Pressable
            key={k.value}
            onPress={() => setPickedKind(k.value)}
            style={[styles.chip, pickedKind === k.value && styles.chipOn]}
          >
            <Text
              style={[
                styles.chipText,
                pickedKind === k.value && styles.chipTextOn,
              ]}
            >
              {k.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.subtle}>
        After you submit, the other circle&apos;s owner (or the target
        minor&apos;s managing parent) needs to approve before the link
        activates.
      </Text>
      <Button
        label={saving ? "Sending…" : "Request link"}
        onPress={onSubmit}
        loading={saving}
        disabled={!pickedTargetId}
      />
      {message ? <Text style={styles.errorText}>{message}</Text> : null}
    </Card>
  );
}

function PendingLinkRow({
  link,
  memberById,
  onChanged,
}: {
  link: CrossCircleLinkRow;
  memberById: Map<string, CrossCircleMember>;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"none" | "approve" | "decline">("none");
  const source = memberById.get(link.source_membership_id);
  const target = memberById.get(link.target_membership_id);

  const onApprove = async () => {
    setBusy("approve");
    try {
      await approveCrossCircleLink(link.id);
      onChanged();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't approve");
    } finally {
      setBusy("none");
    }
  };
  const onDecline = async () => {
    setBusy("decline");
    try {
      await declineCrossCircleLink(link.id);
      onChanged();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't decline");
    } finally {
      setBusy("none");
    }
  };

  return (
    <View style={styles.linkRow}>
      <Text style={styles.linkTitle}>
        {source?.displayName ?? "?"} → {target?.displayName ?? "?"}
      </Text>
      <Text style={styles.subtle}>
        {link.kind} · {source?.familyCircleName ?? ""} ↔ {target?.familyCircleName ?? ""}
      </Text>
      <View style={styles.actionsRow}>
        <Button
          label={busy === "approve" ? "Approving…" : "Approve"}
          variant="secondary"
          onPress={onApprove}
          loading={busy === "approve"}
        />
        <Button
          label={busy === "decline" ? "Declining…" : "Decline"}
          variant="ghost"
          onPress={onDecline}
          loading={busy === "decline"}
        />
      </View>
    </View>
  );
}

function ActiveLinkRow({
  link,
  memberById,
  mySourceMembershipIds,
  onDeleted,
}: {
  link: CrossCircleLinkRow;
  memberById: Map<string, CrossCircleMember>;
  mySourceMembershipIds: string[];
  onDeleted: () => void;
}) {
  const source = memberById.get(link.source_membership_id);
  const target = memberById.get(link.target_membership_id);
  const canDelete = mySourceMembershipIds.includes(link.source_membership_id);

  const onDelete = () => {
    Alert.alert(
      "Remove this link?",
      "Auto-scheduling between these two will stop.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCrossCircleLink(link.id);
              onDeleted();
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Couldn't remove");
            }
          },
        },
      ]
    );
  };

  return (
    <ListItem
      title={`${source?.displayName ?? "?"} ↔ ${target?.displayName ?? "?"}`}
      subtitle={`${link.kind} · ${source?.familyCircleName ?? ""} ↔ ${target?.familyCircleName ?? ""}`}
      trailing={<Badge tone="success" label={link.kind} />}
      onPress={canDelete ? onDelete : undefined}
    />
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
  subtle: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
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
  errorText: { fontSize: fontSize.sm, color: colors.danger },
  linkRow: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  linkTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  actionsRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
});
