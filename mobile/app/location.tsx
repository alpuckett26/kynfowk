import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { router } from "expo-router";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { fetchLocationShares, saveLocationShare, stopLocationShare } from "@/lib/location";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type { LocationShare, LocationSharesResponse } from "@/types/api";

const DURATIONS = [1, 8, 24] as const;

export default function LocationScreen() {
  const [data, setData] = useState<LocationSharesResponse | null>(null);
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setData(await fetchLocationShares()); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't load family locations."); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const share = async () => {
    setBusy(true); setMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setMessage("Location permission stays in your hands. Enable it when you are ready to share.");
        return;
      }
      const point = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = await saveLocationShare({
        latitude: point.coords.latitude,
        longitude: point.coords.longitude,
        accuracyMeters: point.coords.accuracy,
        durationHours: duration,
      });
      setMessage(result.recipientCount
        ? `Shared with ${result.recipientCount} immediate ${result.recipientCount === 1 ? "family member" : "family members"}.`
        : "Location saved, but no active immediate family members are connected yet.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't share your location.");
    } finally { setBusy(false); }
  };

  const stop = async () => {
    setBusy(true); setMessage(null);
    try { await stopLocationShare(); setMessage("Location sharing stopped."); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't stop sharing."); }
    finally { setBusy(false); }
  };

  return (
    <Screen onRefresh={load} refreshing={busy}>
      <Button label="← Family" variant="ghost" onPress={() => router.back()} />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Immediate family</Text>
        <Text style={styles.title}>Share where you are</Text>
        <Text style={styles.lede}>A small check-in for peace of mind. You choose when it starts, who sees it, and when it ends.</Text>
      </View>

      <Card>
        <Text style={styles.cardTitle}>{data && !data.needsOnboarding && data.viewerShare ? "You are sharing" : "Share my current location"}</Text>
        <Text style={styles.body}>Kynfowk uses your location once while this screen is open. It does not track you in the background.</Text>
        <View style={styles.durationRow}>
          {DURATIONS.map((hours) => (
            <Pressable key={hours} onPress={() => setDuration(hours)} style={[styles.duration, duration === hours && styles.durationSelected]}>
              <Text style={[styles.durationText, duration === hours && styles.durationTextSelected]}>{hours === 24 ? "1 day" : `${hours} hr`}</Text>
            </Pressable>
          ))}
        </View>
        <Button label={busy ? "Finding you…" : data && !data.needsOnboarding && data.viewerShare ? "Refresh my location" : "Share my location"} loading={busy} onPress={() => void share()} />
        {data && !data.needsOnboarding && data.viewerShare ? <Button label="Stop sharing" variant="danger" disabled={busy} onPress={() => void stop()} /> : null}
        {message ? <Text style={styles.status}>{message}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Family sharing now</Text>
        {!data ? <Text style={styles.body}>Gathering family locations…</Text> : data.needsOnboarding ? <EmptyState title="Start your circle first" description="Location sharing opens after you join a Family Circle." /> : data.shares.length === 0 ? <EmptyState title="No one is sharing right now" description="When immediate family chooses to share, their latest location will appear here." /> : data.shares.map((share) => <LocationRow key={share.id} share={share} />)}
      </Card>
    </Screen>
  );
}

function LocationRow({ share }: { share: LocationShare }) {
  const expires = new Date(share.sharedUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <Pressable style={styles.locationRow} onPress={() => void Linking.openURL(`https://maps.google.com/?q=${share.latitude},${share.longitude}`)}>
      <View style={styles.pin}><Text>●</Text></View>
      <View style={styles.locationCopy}>
        <Text style={styles.name}>{share.isViewer ? "You" : share.displayName}</Text>
        <Text style={styles.body}>Updated {new Date(share.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ends {expires}</Text>
      </View>
      <Text style={styles.mapLink}>Map →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm }, eyebrow: { color: colors.accent, fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 1.4, textTransform: "uppercase" },
  title: { color: colors.text, fontSize: fontSize.xxl, fontWeight: fontWeight.black }, lede: { color: colors.textMuted, fontSize: fontSize.md, lineHeight: 22 },
  cardTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: fontWeight.bold }, body: { color: colors.textMuted, fontSize: fontSize.sm, lineHeight: 19 }, status: { color: colors.success, fontSize: fontSize.sm },
  durationRow: { flexDirection: "row", gap: spacing.sm }, duration: { borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }, durationSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, durationText: { color: colors.textMuted, fontWeight: fontWeight.bold }, durationTextSelected: { color: colors.primaryText },
  locationRow: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md }, pin: { alignItems: "center", backgroundColor: colors.successBg, borderRadius: radius.pill, height: 36, justifyContent: "center", width: 36 }, locationCopy: { flex: 1 }, name: { color: colors.text, fontSize: fontSize.md, fontWeight: fontWeight.bold }, mapLink: { color: colors.accent, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
});
