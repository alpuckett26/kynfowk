import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { colors, fontSize, fontWeight, spacing } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

export default function MeTab() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth
      .getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const onSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, []);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Me</Text>
        <Text style={styles.title}>Profile & settings</Text>
      </View>

      <Card>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.value}>{email ?? "—"}</Text>
      </Card>

      <Card>
        <Text style={styles.label}>Settings</Text>
        <Button
          label="Profile"
          variant="secondary"
          onPress={() => router.push("/settings/profile")}
        />
        <Button
          label="Notification preferences"
          variant="secondary"
          onPress={() => router.push("/settings/notifications")}
        />
        <Button
          label="Family Circle"
          variant="secondary"
          onPress={() => router.push("/settings/circle")}
        />
      </Card>

      <Card>
        <Text style={styles.label}>Help</Text>
        <Button
          label="Send feedback"
          variant="secondary"
          onPress={() => router.push("/feedback")}
        />
      </Card>

      <Button label="Sign out" variant="danger" onPress={onSignOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.accent,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  label: {
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.textSubtle,
    fontWeight: fontWeight.bold,
  },
  value: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  muted: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
