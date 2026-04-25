import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

type FamilyContext =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "no-family"; email: string }
  | { kind: "ok"; email: string; circleName: string };

export default function HomeScreen() {
  const [ctx, setCtx] = useState<FamilyContext>({ kind: "loading" });

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCtx({ kind: "signed-out" });
        return;
      }

      // Resolve current family circle via family_memberships.
      const { data } = await supabase
        .from("family_memberships")
        .select("family_circle_id, family_circles(name)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle<{
          family_circle_id: string;
          family_circles: { name: string } | null;
        }>();

      if (!data?.family_circle_id) {
        setCtx({ kind: "no-family", email: user.email ?? "" });
        return;
      }

      setCtx({
        kind: "ok",
        email: user.email ?? "",
        circleName: data.family_circles?.name ?? "Your circle",
      });
    })();
  }, []);

  if (ctx.kind === "loading") {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (ctx.kind === "signed-out") {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>Kynfowk</Text>
        <Text style={styles.body}>Sign in to see your family circle.</Text>
        <Pressable style={styles.cta} onPress={() => router.push("/login")}>
          <Text style={styles.ctaText}>Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (ctx.kind === "no-family") {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.body}>
          Signed in as {ctx.email}. You aren&apos;t part of a family circle yet —
          finish setup at kynfowk.vercel.app.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Family circle</Text>
      <Text style={styles.title}>{ctx.circleName}</Text>
      <Text style={styles.body}>Signed in as {ctx.email}.</Text>
      <Text style={[styles.body, styles.muted]}>
        Upcoming calls list coming next.
      </Text>
      <Pressable
        style={[styles.cta, styles.ctaSecondary]}
        onPress={async () => {
          await supabase.auth.signOut();
          setCtx({ kind: "signed-out" });
        }}
      >
        <Text style={styles.ctaSecondaryText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdf6ec",
    paddingHorizontal: 24,
    paddingTop: 80,
    gap: 12,
  },
  center: { justifyContent: "center", alignItems: "center" },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: 11,
    fontWeight: "700",
    color: "#8a6a3a",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#1f1916" },
  body: { fontSize: 15, color: "#3f342b", lineHeight: 22 },
  muted: { color: "#8a7a66" },
  cta: {
    marginTop: 24,
    backgroundColor: "#1f1916",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  ctaText: { color: "#fdf6ec", fontWeight: "700", fontSize: 14 },
  ctaSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1f1916",
    alignSelf: "flex-start",
  },
  ctaSecondaryText: { color: "#1f1916", fontWeight: "700", fontSize: 14 },
});
