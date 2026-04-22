import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

// LiveKit temporarily stubbed out to isolate crash cause
export default function CallScreen() {
  const { callId } = useLocalSearchParams<{ callId: string }>();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Call {callId}</Text>
      <Pressable style={styles.btn} onPress={() => router.back()}>
        <Text style={styles.btnText}>Go back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f", alignItems: "center", justifyContent: "center" },
  text: { color: "#fff", fontSize: 20, marginBottom: 24 },
  btn: { backgroundColor: "#ef4444", padding: 16, borderRadius: 12 },
  btnText: { color: "#fff", fontWeight: "700" },
});
