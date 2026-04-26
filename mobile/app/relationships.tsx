import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Toggle } from "@/components/Toggle";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { ListItem, SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import {
  createFamilyUnit,
  createRelationship,
  deleteFamilyUnit,
  deleteRelationship,
  fetchRelationships,
} from "@/lib/relationships";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type {
  FamilyUnit,
  RelationshipEdge,
  RelationshipKind,
  RelationshipsSnapshot,
} from "@/types/api";

const KIND_OPTIONS: { value: RelationshipKind; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "spouse", label: "Spouse" },
  { value: "partner", label: "Partner" },
  { value: "sibling", label: "Sibling" },
  { value: "grandparent", label: "Grandparent" },
  { value: "grandchild", label: "Grandchild" },
  { value: "in_law", label: "In-law" },
  { value: "step_parent", label: "Step-parent" },
  { value: "step_child", label: "Step-child" },
  { value: "guardian", label: "Guardian" },
  { value: "ward", label: "Ward" },
  { value: "other", label: "Other" },
];

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "needs-onboarding" }
  | { kind: "ok"; snapshot: RelationshipsSnapshot };

export default function RelationshipsScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const res = await fetchRelationships();
      if (res.needsOnboarding) {
        setState({ kind: "needs-onboarding" });
        return;
      }
      setState({ kind: "ok", snapshot: res });
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load relationships";
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
  if (state.kind === "needs-onboarding") {
    return (
      <Screen>
        <EmptyState
          title="No circle yet"
          description="Create a family circle first."
        />
      </Screen>
    );
  }

  const { snapshot } = state;
  const isOwner = snapshot.viewerRole === "owner";

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{snapshot.circle.name}</Text>
        <Text style={styles.title}>Relationships</Text>
        <Text style={styles.lede}>
          Tag how people are related. Group households into family units.
        </Text>
      </View>

      {isOwner ? (
        <AddEdgeCard
          members={snapshot.members}
          onAdded={() => void load()}
        />
      ) : null}

      <Card>
        <SectionHeader title={`Relationships · ${snapshot.edges.length}`} />
        {snapshot.edges.length === 0 ? (
          <EmptyState
            title="No relationships yet"
            description={
              isOwner
                ? "Use the form above to start mapping how people are related."
                : "The circle owner hasn't tagged any relationships yet."
            }
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {snapshot.edges.map((edge) => (
              <EdgeRow
                key={edge.id}
                edge={edge}
                members={snapshot.members}
                canDelete={isOwner}
                onDeleted={() => void load()}
              />
            ))}
          </View>
        )}
      </Card>

      {isOwner ? (
        <AddUnitCard
          members={snapshot.members}
          onCreated={() => void load()}
        />
      ) : null}

      <Card>
        <SectionHeader title={`Family units · ${snapshot.units.length}`} />
        {snapshot.units.length === 0 ? (
          <EmptyState
            title="No units yet"
            description={
              isOwner
                ? "Group people into households or branches above."
                : "The circle owner hasn't grouped anyone yet."
            }
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {snapshot.units.map((unit) => (
              <UnitRow
                key={unit.id}
                unit={unit}
                members={snapshot.members}
                canDelete={isOwner}
                onDeleted={() => void load()}
              />
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function AddEdgeCard({
  members,
  onAdded,
}: {
  members: RelationshipsSnapshot["members"];
  onAdded: () => void;
}) {
  const [source, setSource] = useState<string | null>(null);
  const [kind, setKind] = useState<RelationshipKind>("parent");
  const [target, setTarget] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!source || !target) {
      setMessage("Pick both members.");
      return;
    }
    if (source === target) {
      setMessage("Pick two different members.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await createRelationship({
        sourceMembershipId: source,
        targetMembershipId: target,
        kind,
        notes: notes.trim() || undefined,
      });
      setSource(null);
      setTarget(null);
      setNotes("");
      onAdded();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Add a relationship" />
      <Text style={styles.fieldLabel}>From</Text>
      <View style={styles.chipRow}>
        {members.map((m) => (
          <Chip
            key={m.id}
            label={m.display_name}
            on={source === m.id}
            onPress={() => setSource(source === m.id ? null : m.id)}
          />
        ))}
      </View>
      <Text style={styles.fieldLabel}>Is</Text>
      <View style={styles.chipRow}>
        {KIND_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            on={kind === opt.value}
            onPress={() => setKind(opt.value)}
          />
        ))}
      </View>
      <Text style={styles.fieldLabel}>Of</Text>
      <View style={styles.chipRow}>
        {members.map((m) => (
          <Chip
            key={m.id}
            label={m.display_name}
            on={target === m.id}
            onPress={() => setTarget(target === m.id ? null : m.id)}
          />
        ))}
      </View>
      <Input
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. through marriage"
      />
      <Button
        label={saving ? "Saving…" : "Add relationship"}
        onPress={onSubmit}
        loading={saving}
        disabled={!source || !target}
      />
      {message ? <Text style={styles.errorText}>{message}</Text> : null}
    </Card>
  );
}

function EdgeRow({
  edge,
  members,
  canDelete,
  onDeleted,
}: {
  edge: RelationshipEdge;
  members: RelationshipsSnapshot["members"];
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const sourceName = members.find((m) => m.id === edge.source_membership_id)?.display_name ?? "?";
  const targetName = members.find((m) => m.id === edge.target_membership_id)?.display_name ?? "?";
  const kindLabel =
    KIND_OPTIONS.find((k) => k.value === edge.kind)?.label ?? edge.kind;

  const onDelete = () => {
    Alert.alert(
      "Remove relationship?",
      `${sourceName} is ${kindLabel.toLowerCase()} of ${targetName}.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRelationship(edge.id);
              onDeleted();
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Couldn't delete");
            }
          },
        },
      ]
    );
  };

  return (
    <ListItem
      title={`${sourceName} → ${targetName}`}
      subtitle={kindLabel + (edge.notes ? ` · ${edge.notes}` : "")}
      onPress={canDelete ? onDelete : undefined}
      trailing={canDelete ? <Badge label="Edit" /> : null}
    />
  );
}

function AddUnitCard({
  members,
  onCreated,
}: {
  members: RelationshipsSnapshot["members"];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setMessage("Give the unit a name.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await createFamilyUnit({
        name: trimmed,
        kind: "household",
        memberIds: [...picked],
      });
      setName("");
      setPicked(new Set());
      onCreated();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionHeader title="Create a family unit" />
      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="The Nashville house, Mom's branch…"
      />
      <Text style={styles.fieldLabel}>Members</Text>
      <View style={{ gap: spacing.sm }}>
        {members.map((m) => (
          <Toggle
            key={m.id}
            label={m.display_name}
            checked={picked.has(m.id)}
            onToggle={() => {
              setPicked((prev) => {
                const next = new Set(prev);
                if (next.has(m.id)) next.delete(m.id);
                else next.add(m.id);
                return next;
              });
            }}
          />
        ))}
      </View>
      <Button
        label={saving ? "Creating…" : "Create unit"}
        onPress={onSubmit}
        loading={saving}
        disabled={!name.trim()}
      />
      {message ? <Text style={styles.errorText}>{message}</Text> : null}
    </Card>
  );
}

function UnitRow({
  unit,
  members,
  canDelete,
  onDeleted,
}: {
  unit: FamilyUnit;
  members: RelationshipsSnapshot["members"];
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const memberNames = unit.memberIds
    .map((m) => members.find((mm) => mm.id === m.membershipId)?.display_name)
    .filter((n): n is string => Boolean(n))
    .join(", ");

  const onDelete = () => {
    Alert.alert(
      "Delete this unit?",
      `${unit.name} will be removed. Members stay in the circle.`,
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteFamilyUnit(unit.id);
              onDeleted();
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Couldn't delete");
            }
          },
        },
      ]
    );
  };

  return (
    <ListItem
      title={unit.name}
      subtitle={memberNames || "No members yet"}
      onPress={canDelete ? onDelete : undefined}
      trailing={canDelete ? <Badge label="Edit" /> : null}
    />
  );
}

function Chip({
  label,
  on,
  onPress,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, on && styles.chipOn]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
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
});
