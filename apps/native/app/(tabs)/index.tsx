import { View, Text } from "react-native";
import { supabase } from "@/lib/supabase";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#7c3aed", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>Supabase test</Text>
      <Text style={{ color: "#ddd6fe", fontSize: 14, marginTop: 8 }}>
        {typeof supabase === "object" ? "supabase: OK" : "supabase: FAIL"}
      </Text>
    </View>
  );
}
