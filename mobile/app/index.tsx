import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

type UpcomingCall = {
  id: string;
  title: string;
  scheduled_start: string;
  status: string;
};

type FamilyContext =
  | { kind: "loading" }
  | { kind: "signed-out" }
  | { kind: "no-family"; email: string }
  | {
      kind: "ok";
      email: string;
      circleName: string;
      circleId: string;
      upcoming: UpcomingCall[];
      upcomingError: string | null;
    };

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export default function HomeScreen() {
  const [ctx, setCtx] = useState<FamilyContext>({ kind: "loading" });

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setCtx({ kind: "loading" });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCtx({ kind: "signed-out" });
      return;
    }

    const { data: membership } = await supabase
      .from("family_memberships")
      .select("family_circle_id, family_circles(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle<{
        family_circle_id: string;
        family_circles: { name: string } | null;
      }>();

    if (!membership?.family_circle_id) {
      setCtx({ kind: "no-family", email: user.email ?? "" });
      return;
    }

    const { data: calls, error: callsError } = await supabase
      .from("call_sessions")
      .select("id, title, scheduled_start, status")
      .eq("family_circle_id", membership.family_circle_id)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_start", new Date().toISOString())
      .order("scheduled_start", { ascending: true })
      .limit(10);

    setCtx({
      kind: "ok",
      email: user.email ?? "",
      circleName: membership.family_circles?.name ?? "Your circle",
      circleId: membership.family_circle_id,
      upcoming: (calls ?? []) as UpcomingCall[],
      upcomingError: callsError?.message ?? null,
    });
  }

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
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Family circle</Text>
        <Text style={styles.title}>{ctx.circleName}</Text>
        <Text style={[styles.body, styles.muted]}>{ctx.email}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          <Pressable onPress={() => void load()}>
            <Text style={styles.refresh}>Refresh</Text>
          </Pressable>
        </View>

        {ctx.upcomingError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              Couldn&apos;t load calls: {ctx.upcomingError}
            </Text>
          </View>
        ) : ctx.upcoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No upcoming calls</Text>
            <Text style={styles.emptyBody}>
              Schedule one from kynfowk.vercel.app for now. Native scheduling
              coming next.
            </Text>
          </View>
        ) : (
          <FlatList
            data={ctx.upcoming}
            keyExtractor={(c) => c.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => {
              const when = new Date(item.scheduled_start);
              return (
                <View style={styles.callCard}>
                  <View style={styles.callRow}>
                    <Text style={styles.callTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.status === "in_progress" && (
                      <View style={styles.badgeLive}>
                        <Text style={styles.badgeLiveText}>Live</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.callMeta}>
                    {dateFmt.format(when)} · {timeFmt.format(when)}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </View>

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
    gap: 24,
  },
  center: { justifyContent: "center", alignItems: "center" },
  header: { gap: 4 },
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
  section: { gap: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1f1916",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  refresh: { fontSize: 13, color: "#8a6a3a", fontWeight: "600" },
  callCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#ecdcc5",
    gap: 4,
  },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  callTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1f1916",
  },
  callMeta: { fontSize: 13, color: "#6a584a" },
  badgeLive: {
    backgroundColor: "#1f1916",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeLiveText: {
    color: "#fdf6ec",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ecdcc5",
    borderStyle: "dashed",
    gap: 6,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#1f1916" },
  emptyBody: { fontSize: 13, color: "#6a584a", lineHeight: 19 },
  errorCard: {
    backgroundColor: "#f5dada",
    borderRadius: 12,
    padding: 14,
  },
  errorText: { fontSize: 13, color: "#7a2727" },
  cta: {
    marginTop: 8,
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
