import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS } from "@/lib/constants";

interface UpcomingCallCardProps {
  title: string;
  date: string;
  time: string;
  participants: string;
  onJoin: () => void;
}

export function UpcomingCallCard({
  title,
  date,
  time,
  participants,
  onJoin,
}: UpcomingCallCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>📅</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {date} at {time} · {participants}
        </Text>
      </View>
      <Pressable style={styles.joinBtn} onPress={onJoin}>
        <Text style={styles.joinBtnText}>Join →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 14,
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 20 },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600", color: COLORS.gray900 },
  meta: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  joinBtn: {
    backgroundColor: COLORS.brandLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  joinBtnText: { fontSize: 12, fontWeight: "700", color: COLORS.brand },
});
