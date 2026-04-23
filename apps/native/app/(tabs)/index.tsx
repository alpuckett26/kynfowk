import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#7c3aed", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>EXPO-ROUTER OK</Text>
      <Text style={{ color: "#ddd6fe", fontSize: 14, marginTop: 8 }}>Purple = expo-router works</Text>
    </View>
  );
}
