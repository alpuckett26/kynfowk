import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Kynfowk</Text>
      <Text style={{ fontSize: 14, color: "#6b7280", marginTop: 8 }}>App loaded successfully</Text>
    </View>
  );
}
