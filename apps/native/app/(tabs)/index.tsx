import { useEffect } from "react";
import { View, Text, Alert } from "react-native";

export default function HomeScreen() {
  useEffect(() => {
    Alert.alert("App loaded!", "React is rendering. Env vars OK?");
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#e11d48" }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: "#fff" }}>Kynfowk</Text>
      <Text style={{ fontSize: 14, color: "#fecdd3", marginTop: 8 }}>
        EXPO_PUBLIC_SUPABASE_URL: {process.env.EXPO_PUBLIC_SUPABASE_URL ? "SET" : "MISSING"}
      </Text>
      <Text style={{ fontSize: 14, color: "#fecdd3", marginTop: 4 }}>
        EXPO_PUBLIC_SUPABASE_ANON_KEY: {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? "SET" : "MISSING"}
      </Text>
      <Text style={{ fontSize: 14, color: "#fecdd3", marginTop: 4 }}>
        EXPO_PUBLIC_PROJECT_ID: {process.env.EXPO_PUBLIC_PROJECT_ID ? "SET" : "MISSING"}
      </Text>
      <Text style={{ fontSize: 14, color: "#fecdd3", marginTop: 4 }}>
        EXPO_PUBLIC_LIVEKIT_URL: {process.env.EXPO_PUBLIC_LIVEKIT_URL ? "SET" : "MISSING"}
      </Text>
      <Text style={{ fontSize: 14, color: "#fecdd3", marginTop: 4 }}>
        EXPO_PUBLIC_APP_URL: {process.env.EXPO_PUBLIC_APP_URL ? "SET" : "MISSING"}
      </Text>
    </View>
  );
}
