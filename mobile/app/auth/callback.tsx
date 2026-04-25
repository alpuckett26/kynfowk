import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";

/**
 * Magic-link deep-link handler. Supabase redirects to
 * kynfowk://auth/callback?code=... on the device after the user
 * taps the link in their email. We exchange the code for a session
 * (which persists via AsyncStorage) and bounce to home.
 */
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    void (async () => {
      const code = params.code;
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }
      router.replace("/");
    })();
  }, [params.code]);

  return (
    <View style={styles.container}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdf6ec",
    justifyContent: "center",
    alignItems: "center",
  },
});
