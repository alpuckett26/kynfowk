import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";

export default function HomeScreen() {
  const [counter, setCounter] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HOME TAB RENDERING</Text>
      <Text style={styles.marker}>counter: {counter}</Text>
      <Pressable style={styles.button} onPress={() => setCounter((c) => c + 1)}>
        <Text style={styles.buttonText}>TAP TO INCREMENT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ff00ff", paddingTop: 80, paddingHorizontal: 20, gap: 20, alignItems: "center" },
  title: { fontSize: 28, fontWeight: "900", color: "#ffffff", textAlign: "center" },
  marker: { fontSize: 24, color: "#ffff00", fontFamily: "monospace", fontWeight: "900" },
  button: { backgroundColor: "#000000", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 16 },
  buttonText: { color: "#00ff00", fontSize: 18, fontWeight: "900" },
});
