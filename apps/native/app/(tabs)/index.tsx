import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function HomeScreen() {
  const [counter, setCounter] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home (tap-triggered setState)</Text>
      <Text style={styles.marker}>counter: {counter}</Text>
      <Pressable style={styles.button} onPress={() => setCounter((c) => c + 1)}>
        <Text style={styles.buttonText}>Tap to increment</Text>
      </Pressable>
      <Text style={styles.hint}>
        If tapping crashes: setState is broken at any time.{"\n"}
        If tapping increments: only mount-driven setState crashes;
        we can ship with tap/button-triggered state updates.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 80, paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  marker: { fontSize: 14, color: "#059669", fontFamily: "monospace" },
  button: { backgroundColor: "#d946ef", borderRadius: 12, padding: 16, alignItems: "center" },
  buttonText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  hint: { fontSize: 12, color: "#6b7280", marginTop: 16 },
});
