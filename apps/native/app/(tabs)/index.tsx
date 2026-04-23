import { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

function useTrivialHook() {
  const [counter, setCounter] = useState(0);
  useEffect(() => {
    setCounter(1);
  }, []);
  return counter;
}

export default function HomeScreen() {
  const counter = useTrivialHook();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home (hook + Text only)</Text>
      <Text style={styles.marker}>counter: {counter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", paddingTop: 80, paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  marker: { fontSize: 14, color: "#059669", fontFamily: "monospace" },
});
