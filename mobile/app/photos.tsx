import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { EmptyState } from "@/components/EmptyState";
import { SectionHeader } from "@/components/ListItem";
import { ApiError } from "@/lib/api";
import { fetchPhotos, pickAndUploadPhoto, removePhoto } from "@/lib/photos";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import { relativeTime } from "@/lib/format";
import type { CarouselPhoto } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      photos: CarouselPhoto[];
      viewerMembershipId: string;
    };

export default function PhotosScreen() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchPhotos();
      setState({
        kind: "ok",
        photos: res.photos,
        viewerMembershipId: res.viewerMembershipId,
      });
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load photos";
      setState({ kind: "error", message: m });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onPick = async () => {
    if (state.kind !== "ok") return;
    setUploading(true);
    setMessage(null);
    try {
      const res = await pickAndUploadPhoto(state.viewerMembershipId, caption.trim());
      if (res.success) {
        setCaption("");
        setMessage("Photo added.");
        await load();
      } else if (res.reason !== "Cancelled") {
        setMessage(res.reason);
      }
    } finally {
      setUploading(false);
    }
  };

  const onRemove = (id: string) => {
    Alert.alert("Remove this photo?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removePhoto(id);
            await load();
          } catch (e) {
            Alert.alert("Error", e instanceof Error ? e.message : "Couldn't remove");
          }
        },
      },
    ]);
  };

  if (state.kind === "loading") {
    return (
      <Screen scroll={false}>
        <EmptyState title="Loading…" />
      </Screen>
    );
  }
  if (state.kind === "error") {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="Couldn't load photos"
          description={state.message}
          action={<Button label="Try again" variant="secondary" onPress={() => void load()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing}>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Photos</Text>
        <Text style={styles.title}>Family reel</Text>
        <Text style={styles.lede}>
          Share moments with the circle. {state.photos.length} in the reel.
        </Text>
      </View>

      <Card>
        <SectionHeader title="Add a photo" />
        <Input
          label="Caption (optional)"
          value={caption}
          onChangeText={setCaption}
          placeholder="A line about the moment"
        />
        <Button
          label={uploading ? "Uploading…" : "Choose photo"}
          onPress={onPick}
          loading={uploading}
        />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </Card>

      {state.photos.length === 0 ? (
        <Card>
          <EmptyState
            title="No photos yet"
            description="The first one shows up here right after you upload it."
          />
        </Card>
      ) : (
        <View style={styles.gallery}>
          {state.photos.map((p) => {
            const mine = p.membershipId === state.viewerMembershipId;
            return (
              <View key={p.id} style={styles.photoTile}>
                <Image source={{ uri: p.photoUrl }} style={styles.photoImg} />
                <View style={styles.photoMeta}>
                  <Text style={styles.photoBy} numberOfLines={1}>
                    {p.displayName}
                  </Text>
                  {p.caption ? (
                    <Text style={styles.photoCaption} numberOfLines={2}>
                      {p.caption}
                    </Text>
                  ) : null}
                  <Text style={styles.photoTime}>{relativeTime(p.createdAt)}</Text>
                </View>
                {mine ? (
                  <Pressable
                    style={styles.removeBtn}
                    onPress={() => onRemove(p.id)}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", marginBottom: spacing.xs },
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
  lede: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
  message: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: "center" },
  gallery: { gap: spacing.sm },
  photoTile: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    position: "relative",
  },
  photoImg: { width: "100%", height: 240, backgroundColor: colors.surfaceMuted },
  photoMeta: { padding: spacing.md, gap: 2 },
  photoBy: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  photoCaption: { fontSize: fontSize.sm, color: colors.text, lineHeight: 19 },
  photoTime: { fontSize: fontSize.xs, color: colors.textSubtle },
  removeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(31,25,22,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    color: colors.primaryText,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
