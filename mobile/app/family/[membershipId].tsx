import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import {
  blockMember,
  fetchFamilyMembers,
  removeMember,
  resendInvite,
  unblockMember,
  updateMember,
} from "@/lib/family";
import { pickAndUploadAvatar } from "@/lib/photos";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import type { FamilyMember } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      member: FamilyMember;
      viewerMembershipId: string;
      viewerRole: "owner" | "member";
    };

export default function MemberDetailScreen() {
  const { membershipId } = useLocalSearchParams<{ membershipId: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [displayName, setDisplayName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [birthday, setBirthday] = useState("");
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [hometown, setHometown] = useState("");
  const [faithNotes, setFaithNotes] = useState("");
  const [prayerIntentions, setPrayerIntentions] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchFamilyMembers();
      if (res.needsOnboarding) {
        setState({ kind: "error", message: "Not part of a family circle" });
        return;
      }
      const member = res.members.find((m: FamilyMember) => m.id === membershipId);
      if (!member) {
        setState({ kind: "error", message: "Member not found" });
        return;
      }
      setState({
        kind: "ok",
        member,
        viewerMembershipId: res.viewerMembershipId,
        viewerRole: res.viewerRole,
      });
      setDisplayName(member.display_name);
      setRelationship(member.relationship_label ?? "");
      setPhone(member.phone_number ?? "");
      setAddress(member.address ?? "");
      setBirthday(member.birthday ?? "");
      setNickname(member.nickname ?? "");
      setBio(member.bio ?? "");
      setFavoriteFood(member.favorite_food ?? "");
      setPronouns(member.pronouns ?? "");
      setHometown(member.hometown ?? "");
      setFaithNotes(member.faith_notes ?? "");
      setPrayerIntentions(member.prayer_intentions ?? "");
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load member";
      setState({ kind: "error", message: m });
    }
  }, [membershipId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (state.kind !== "ok") return false;
    const m = state.member;
    return (
      displayName !== m.display_name ||
      relationship !== (m.relationship_label ?? "") ||
      phone !== (m.phone_number ?? "") ||
      address !== (m.address ?? "") ||
      birthday !== (m.birthday ?? "") ||
      nickname !== (m.nickname ?? "") ||
      bio !== (m.bio ?? "") ||
      favoriteFood !== (m.favorite_food ?? "") ||
      pronouns !== (m.pronouns ?? "") ||
      hometown !== (m.hometown ?? "") ||
      faithNotes !== (m.faith_notes ?? "") ||
      prayerIntentions !== (m.prayer_intentions ?? "")
    );
  }, [
    state,
    displayName,
    relationship,
    phone,
    address,
    birthday,
    nickname,
    bio,
    favoriteFood,
    pronouns,
    hometown,
    faithNotes,
    prayerIntentions,
  ]);

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
          title="Couldn't load member"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  const { member, viewerRole, viewerMembershipId } = state;
  const isOwner = viewerRole === "owner";
  const isSelf = member.id === viewerMembershipId;
  const canEdit = isOwner || isSelf;
  const canRemove = isOwner && !isSelf && member.role !== "owner";
  const canBlockUnblock = isOwner && !isSelf && member.role !== "owner";

  const onSaveEdit = async () => {
    setEditMessage(null);
    setSavingEdit(true);
    try {
      await updateMember(member.id, {
        displayName,
        relationshipLabel: relationship,
        phoneNumber: phone,
        address,
        birthday: birthday.trim() || null,
        nickname,
        bio,
        favoriteFood,
        pronouns,
        hometown,
        faithNotes,
        prayerIntentions,
      });
      await load();
      setEditMessage("Saved.");
    } catch (e) {
      setEditMessage(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSavingEdit(false);
    }
  };

  const onBlock = () => {
    Alert.alert(
      "Block member?",
      `${member.display_name} won't appear in suggestions or be invitable to new calls. They stay in the circle but quiet.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await blockMember(member.id);
              await load();
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Couldn't block");
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const onUnblock = async () => {
    setBusy(true);
    try {
      await unblockMember(member.id);
      await load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't unblock");
    } finally {
      setBusy(false);
    }
  };

  const onResendInvite = async () => {
    setBusy(true);
    try {
      await resendInvite(member.id);
      Alert.alert("Invite sent", `${member.display_name} should get an email shortly.`);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't resend invite");
    } finally {
      setBusy(false);
    }
  };

  const onSetPhoto = async () => {
    setBusy(true);
    try {
      const res = await pickAndUploadAvatar(member.id);
      if (!res.success) {
        if (res.reason !== "Cancelled") {
          Alert.alert("Couldn't upload", res.reason);
        }
        return;
      }
      await load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Couldn't upload photo");
    } finally {
      setBusy(false);
    }
  };

  const onRemove = () => {
    Alert.alert(
      "Remove member?",
      `${member.display_name} will be removed from the Family Circle. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await removeMember(member.id);
              router.back();
            } catch (e) {
              Alert.alert(
                "Error",
                e instanceof Error ? e.message : "Couldn't remove"
              );
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Member</Text>
        <Text style={styles.title}>{member.display_name}</Text>
        <View style={styles.badges}>
          {member.is_deceased ? (
            <Badge tone="neutral" label="In memoriam" />
          ) : member.blocked_at ? (
            <Badge tone="danger" label="Blocked" />
          ) : member.is_placeholder ? (
            <Badge tone="warning" label="Placeholder" />
          ) : member.role === "owner" ? (
            <Badge tone="success" label="Owner" />
          ) : member.status === "active" ? (
            <Badge tone="success" label="Joined" />
          ) : (
            <Badge tone="neutral" label="Invited" />
          )}
          {member.invite_email ? (
            <Text style={styles.email}>{member.invite_email}</Text>
          ) : null}
        </View>
      </View>

      {canEdit ? (
        <>
          <Card>
            <SectionHeader title="Details" />
            <Input
              label="Display name"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Input
              label="Nickname"
              value={nickname}
              onChangeText={setNickname}
              placeholder="(optional)"
            />
            <Input
              label="Pronouns"
              value={pronouns}
              onChangeText={setPronouns}
              placeholder="she/her, he/him, they/them…"
              autoCapitalize="none"
            />
            <Input
              label="Relationship"
              value={relationship}
              onChangeText={setRelationship}
              placeholder="Sister, grandparent…"
            />
            <Input
              label="Birthday (YYYY-MM-DD)"
              value={birthday}
              onChangeText={setBirthday}
              placeholder="1985-04-26"
              autoCapitalize="none"
            />
            <Input
              label="Hometown"
              value={hometown}
              onChangeText={setHometown}
              placeholder="(optional)"
            />
            <Input
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="(optional)"
              autoCapitalize="none"
            />
            <Input
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="(optional)"
              multiline
            />
            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="A short note about this person"
              multiline
            />
            <Input
              label="Favorite food"
              value={favoriteFood}
              onChangeText={setFavoriteFood}
              placeholder="(optional)"
            />
          </Card>
          <Card>
            <SectionHeader title="Faith & prayer (optional)" />
            <Input
              label="Faith notes"
              value={faithNotes}
              onChangeText={setFaithNotes}
              placeholder="Tradition, parish, ministry…"
              multiline
            />
            <Input
              label="Prayer intentions"
              value={prayerIntentions}
              onChangeText={setPrayerIntentions}
              placeholder="What's on their heart"
              multiline
            />
          </Card>
          <Button
            label={savingEdit ? "Saving…" : dirty ? "Save changes" : "All saved"}
            onPress={onSaveEdit}
            loading={savingEdit}
            disabled={!dirty}
          />
          {editMessage ? <Text style={styles.message}>{editMessage}</Text> : null}
        </>
      ) : (
        <Card>
          <SectionHeader title="Details" />
          {member.nickname ? (
            <>
              <Text style={styles.metaLabel}>Nickname</Text>
              <Text style={styles.metaValue}>{member.nickname}</Text>
            </>
          ) : null}
          {member.pronouns ? (
            <>
              <Text style={styles.metaLabel}>Pronouns</Text>
              <Text style={styles.metaValue}>{member.pronouns}</Text>
            </>
          ) : null}
          <Text style={styles.metaLabel}>Relationship</Text>
          <Text style={styles.metaValue}>{member.relationship_label ?? "—"}</Text>
          {member.birthday ? (
            <>
              <Text style={styles.metaLabel}>Birthday</Text>
              <Text style={styles.metaValue}>{member.birthday}</Text>
            </>
          ) : null}
          {member.hometown ? (
            <>
              <Text style={styles.metaLabel}>Hometown</Text>
              <Text style={styles.metaValue}>{member.hometown}</Text>
            </>
          ) : null}
          {member.phone_number ? (
            <>
              <Text style={styles.metaLabel}>Phone</Text>
              <Text style={styles.metaValue}>{member.phone_number}</Text>
            </>
          ) : null}
          {member.address ? (
            <>
              <Text style={styles.metaLabel}>Address</Text>
              <Text style={styles.metaValue}>{member.address}</Text>
            </>
          ) : null}
          {member.bio ? (
            <>
              <Text style={styles.metaLabel}>Bio</Text>
              <Text style={styles.metaValue}>{member.bio}</Text>
            </>
          ) : null}
          {member.favorite_food ? (
            <>
              <Text style={styles.metaLabel}>Favorite food</Text>
              <Text style={styles.metaValue}>{member.favorite_food}</Text>
            </>
          ) : null}
          {member.faith_notes ? (
            <>
              <Text style={styles.metaLabel}>Faith notes</Text>
              <Text style={styles.metaValue}>{member.faith_notes}</Text>
            </>
          ) : null}
          {member.prayer_intentions ? (
            <>
              <Text style={styles.metaLabel}>Prayer intentions</Text>
              <Text style={styles.metaValue}>{member.prayer_intentions}</Text>
            </>
          ) : null}
        </Card>
      )}

      {member.is_placeholder && member.placeholder_notes ? (
        <Card>
          <SectionHeader title="Notes" />
          <Text style={styles.notes}>{member.placeholder_notes}</Text>
        </Card>
      ) : null}

      {canEdit && !member.is_placeholder && !member.is_deceased ? (
        <Card>
          <SectionHeader title="Photo" />
          <Button
            label={busy ? "Working…" : member.avatar_url ? "Change photo" : "Set photo"}
            variant="secondary"
            onPress={onSetPhoto}
            loading={busy}
          />
        </Card>
      ) : null}

      {isOwner && member.status === "invited" && member.invite_email ? (
        <Card>
          <SectionHeader title="Pending invite" />
          <Text style={styles.message}>
            Email goes to {member.invite_email}.
          </Text>
          <Button
            label={busy ? "Working…" : "Resend invite email"}
            variant="secondary"
            onPress={onResendInvite}
            loading={busy}
          />
        </Card>
      ) : null}

      {(canBlockUnblock || canRemove) ? (
        <Card>
          <SectionHeader title="Owner actions" />
          {canBlockUnblock ? (
            member.blocked_at ? (
              <Button
                label={busy ? "Working…" : "Unblock"}
                variant="secondary"
                onPress={onUnblock}
                loading={busy}
              />
            ) : (
              <Button
                label={busy ? "Working…" : "Block"}
                variant="secondary"
                onPress={onBlock}
                loading={busy}
              />
            )
          ) : null}
          {canRemove ? (
            <Button
              label={busy ? "Working…" : "Remove from circle"}
              variant="danger"
              onPress={onRemove}
              loading={busy}
            />
          ) : null}
        </Card>
      ) : null}
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
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
  email: { fontSize: fontSize.sm, color: colors.textMuted },
  message: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
  metaLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: colors.textSubtle,
  },
  metaValue: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  notes: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
