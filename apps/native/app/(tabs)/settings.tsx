import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Switch,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { COLORS, DEMO_FAMILY_NAME } from "@/lib/constants";

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  rightEl,
  destructive,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  rightEl?: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}
      onPress={onPress}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowIcon}>{icon}</Text>
        <Text style={[styles.rowLabel, destructive && styles.destructive]}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {value && <Text style={styles.rowValue}>{value}</Text>}
        {rightEl}
        {onPress && !rightEl && (
          <Text style={styles.chevron}>›</Text>
        )}
      </View>
    </Pressable>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function SettingsScreen() {
  const [callReminders, setCallReminders] = useState(true);
  const [streakAlerts, setStreakAlerts] = useState(true);
  const [missedCallNudges, setMissedCallNudges] = useState(false);

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => router.replace("/auth"),
      },
    ]);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>💜</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{DEMO_FAMILY_NAME} Family</Text>
          <Text style={styles.profileEmail}>family@example.com</Text>
        </View>
      </View>

      {/* Family */}
      <SettingsSection title="Family">
        <SettingsRow
          icon="👥"
          label="Family members"
          value="4 members"
          onPress={() => {}}
        />
        <Divider />
        <SettingsRow
          icon="➕"
          label="Invite someone"
          onPress={() => {}}
        />
        <Divider />
        <SettingsRow
          icon="📅"
          label="Availability windows"
          onPress={() => {}}
        />
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title="Notifications">
        <SettingsRow
          icon="📞"
          label="Call reminders"
          rightEl={
            <Switch
              value={callReminders}
              onValueChange={setCallReminders}
              trackColor={{ true: COLORS.brand }}
              thumbColor={COLORS.white}
            />
          }
        />
        <Divider />
        <SettingsRow
          icon="🔥"
          label="Streak alerts"
          rightEl={
            <Switch
              value={streakAlerts}
              onValueChange={setStreakAlerts}
              trackColor={{ true: COLORS.brand }}
              thumbColor={COLORS.white}
            />
          }
        />
        <Divider />
        <SettingsRow
          icon="💬"
          label="Missed call nudges"
          rightEl={
            <Switch
              value={missedCallNudges}
              onValueChange={setMissedCallNudges}
              trackColor={{ true: COLORS.brand }}
              thumbColor={COLORS.white}
            />
          }
        />
      </SettingsSection>

      {/* Call preferences */}
      <SettingsSection title="Call preferences">
        <SettingsRow
          icon="🎥"
          label="Default camera"
          value="Front"
          onPress={() => {}}
        />
        <Divider />
        <SettingsRow
          icon="🔇"
          label="Join muted by default"
          rightEl={
            <Switch
              value={false}
              trackColor={{ true: COLORS.brand }}
              thumbColor={COLORS.white}
            />
          }
        />
      </SettingsSection>

      {/* Account */}
      <SettingsSection title="Account">
        <SettingsRow icon="🔒" label="Change password" onPress={() => {}} />
        <Divider />
        <SettingsRow icon="📧" label="Update email" onPress={() => {}} />
        <Divider />
        <SettingsRow
          icon="🚪"
          label="Sign out"
          onPress={handleSignOut}
          destructive
        />
      </SettingsSection>

      <Text style={styles.version}>Kynfowk v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  content: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40, gap: 24 },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: { fontSize: 26 },
  profileName: { fontSize: 17, fontWeight: "700", color: COLORS.gray900 },
  profileEmail: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowPressed: { backgroundColor: COLORS.gray50 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: { fontSize: 18 },
  rowLabel: { fontSize: 15, color: COLORS.gray900 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowValue: { fontSize: 14, color: COLORS.gray400 },
  chevron: { fontSize: 20, color: COLORS.gray200, marginLeft: 2 },
  divider: { height: 1, backgroundColor: COLORS.gray100, marginLeft: 46 },
  destructive: { color: "#ef4444" },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 8,
  },
});
