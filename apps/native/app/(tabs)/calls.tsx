import { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  SectionList,
} from "react-native";
import { router } from "expo-router";
import { COLORS } from "@/lib/constants";

type CallStatus = "upcoming" | "completed" | "missed";

interface CallItem {
  id: string;
  title: string;
  date: string;
  time: string;
  participants: string[];
  durationMin?: number;
  status: CallStatus;
}

const MOCK_CALLS: CallItem[] = [
  {
    id: "c1",
    title: "Sunday catch-up",
    date: "Sun, Mar 16",
    time: "6:00 PM",
    participants: ["Margaret", "David", "Priya", "Lucas"],
    status: "upcoming",
  },
  {
    id: "c2",
    title: "Check-in with Gran",
    date: "Wed, Mar 19",
    time: "11:00 AM",
    participants: ["Margaret", "David"],
    status: "upcoming",
  },
  {
    id: "c3",
    title: "Birthday call",
    date: "Sat, Mar 8",
    time: "7:00 PM",
    participants: ["Margaret", "David", "Lucas"],
    durationMin: 65,
    status: "completed",
  },
  {
    id: "c4",
    title: "Quick check-in",
    date: "Wed, Mar 5",
    time: "12:00 PM",
    participants: ["David", "Priya"],
    durationMin: 12,
    status: "completed",
  },
  {
    id: "c5",
    title: "Sunday catch-up",
    date: "Sun, Mar 2",
    time: "6:00 PM",
    participants: ["Margaret", "David", "Priya", "Lucas"],
    durationMin: 45,
    status: "completed",
  },
  {
    id: "c6",
    title: "Weekday check-in",
    date: "Tue, Feb 25",
    time: "8:00 PM",
    participants: ["David", "Lucas"],
    status: "missed",
  },
];

const STATUS_CONFIG: Record<
  CallStatus,
  { label: string; color: string; bg: string; icon: string }
> = {
  upcoming: { label: "Upcoming", color: COLORS.brand, bg: COLORS.brandLight, icon: "📅" },
  completed: { label: "Completed", color: COLORS.success, bg: COLORS.successLight, icon: "✅" },
  missed: { label: "Missed", color: "#ef4444", bg: "#fee2e2", icon: "❌" },
};

function CallCard({ call }: { call: CallItem }) {
  const cfg = STATUS_CONFIG[call.status];

  return (
    <Pressable
      style={styles.callCard}
      onPress={() => {
        if (call.status === "upcoming") router.push(`/call/${call.id}`);
        else if (call.status === "completed") router.push(`/post-call/${call.id}`);
      }}
    >
      <View style={[styles.callIcon, { backgroundColor: cfg.bg }]}>
        <Text style={styles.callIconText}>{cfg.icon}</Text>
      </View>
      <View style={styles.callInfo}>
        <Text style={styles.callTitle}>{call.title}</Text>
        <Text style={styles.callMeta}>
          {call.date} at {call.time}
        </Text>
        <View style={styles.avatarRow}>
          {call.participants.slice(0, 4).map((p, i) => (
            <View key={p} style={[styles.avatar, { marginLeft: i > 0 ? -8 : 0 }]}>
              <Text style={styles.avatarText}>{p[0]}</Text>
            </View>
          ))}
          {call.participants.length > 4 && (
            <Text style={styles.moreText}>+{call.participants.length - 4}</Text>
          )}
        </View>
      </View>
      <View style={styles.callRight}>
        {call.durationMin && (
          <Text style={styles.duration}>{call.durationMin}m</Text>
        )}
        <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function FilterTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterTab, active && styles.filterTabActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function CallsScreen() {
  const [filter, setFilter] = useState<"all" | CallStatus>("all");

  const filtered =
    filter === "all" ? MOCK_CALLS : MOCK_CALLS.filter((c) => c.status === filter);

  const upcoming = filtered.filter((c) => c.status === "upcoming");
  const past = filtered.filter((c) => c.status !== "upcoming");

  const sections = [
    ...(upcoming.length > 0 ? [{ title: "Upcoming", data: upcoming }] : []),
    ...(past.length > 0 ? [{ title: "Past calls", data: past }] : []),
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Calls</Text>
        <Pressable style={styles.scheduleBtn}>
          <Text style={styles.scheduleBtnText}>+ Schedule</Text>
        </Pressable>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(["all", "upcoming", "completed", "missed"] as const).map((f) => (
          <FilterTab
            key={f}
            label={f.charAt(0).toUpperCase() + f.slice(1)}
            active={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => <CallCard call={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📞</Text>
            <Text style={styles.emptyTitle}>No calls here</Text>
            <Text style={styles.emptyBody}>
              Schedule your first call and it will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gray50 },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  pageTitle: { fontSize: 24, fontWeight: "700", color: COLORS.gray900 },
  scheduleBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  scheduleBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  filters: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  filterTab: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.gray100,
  },
  filterTabActive: { backgroundColor: COLORS.brand },
  filterTabText: { fontSize: 12, fontWeight: "600", color: COLORS.gray500 },
  filterTabTextActive: { color: COLORS.white },
  listContent: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingTop: 16,
    paddingBottom: 8,
  },
  callCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  callIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  callIconText: { fontSize: 20 },
  callInfo: { flex: 1 },
  callTitle: { fontSize: 14, fontWeight: "600", color: COLORS.gray900 },
  callMeta: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  avatarRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  avatarText: { fontSize: 10, fontWeight: "700", color: COLORS.brand },
  moreText: { fontSize: 10, color: COLORS.gray500, marginLeft: 4 },
  callRight: { alignItems: "flex-end", gap: 6 },
  duration: { fontSize: 12, fontWeight: "600", color: COLORS.gray500 },
  statusPill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: COLORS.gray700 },
  emptyBody: {
    fontSize: 13,
    color: COLORS.gray500,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 32,
  },
});
