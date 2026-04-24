import { View, Text } from "react-native";

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#00ff00", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#000", fontSize: 28, fontWeight: "900", textAlign: "center", padding: 20 }}>
        ROOT LAYOUT RENDERED{"\n"}(bypassing expo-router)
      </Text>
    </View>
  );
}
