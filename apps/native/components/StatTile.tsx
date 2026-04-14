import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@/lib/constants";

interface StatTileProps {
  label: string;
  value: string;
  icon: string;
}

export function StatTile({ label, value, icon }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 14,
    alignItems: "center",
  },
  icon: { fontSize: 22, marginBottom: 6 },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.gray900,
  },
  label: {
    fontSize: 11,
    color: COLORS.gray500,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },
});
