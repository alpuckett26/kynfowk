import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { bootLog } from "@/lib/boot-log";

bootLog("110 FamilyReel.tsx module loaded — about to import lib/photos");

import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { ApiError } from "@/lib/api";
import { fetchPhotos } from "@/lib/photos";

bootLog("111 FamilyReel — lib/photos imported successfully");

import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";
import type { CarouselPhoto } from "@/types/api";

const TILE_HEIGHT = 220;
const ADVANCE_MS = 5000;

export function FamilyReel() {
  const [photos, setPhotos] = useState<CarouselPhoto[]>([]);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const indexRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetchPhotos();
      setPhotos(res.photos);
    } catch (e) {
      const m =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't load photos";
      setError(m);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // Auto-advance.
  useEffect(() => {
    if (paused || photos.length <= 1 || width === 0) return;
    intervalRef.current = setInterval(() => {
      const nextIndex = (indexRef.current + 1) % photos.length;
      setIndex(nextIndex);
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    }, ADVANCE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, photos.length, width]);

  const onMomentumScrollEnd = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    if (width === 0) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(i);
  };

  if (error) {
    return null;
  }

  if (photos.length === 0) {
    return (
      <Card>
        <View style={styles.emptyBlock}>
          <Text style={styles.emptyTitle}>The reel starts empty</Text>
          <Text style={styles.emptyBody}>
            Share a moment so the rest of the family sees it scroll by here.
          </Text>
          <Button
            label="Add a photo"
            variant="secondary"
            onPress={() => router.push("/photos")}
          />
        </View>
      </Card>
    );
  }

  return (
    <View
      style={styles.shell}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <Pressable
        onPressIn={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        style={styles.pressable}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
        >
          {photos.map((p) => (
            <View
              key={p.id}
              style={[styles.slide, { width: width || undefined }]}
            >
              <Image source={{ uri: p.photoUrl }} style={styles.image} />
              <View style={styles.caption}>
                <Text style={styles.captionAuthor} numberOfLines={1}>
                  {p.displayName}
                </Text>
                {p.caption ? (
                  <Text style={styles.captionText} numberOfLines={2}>
                    {p.caption}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>
      </Pressable>

      {photos.length > 1 ? (
        <View style={styles.dots}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotOn]}
            />
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push("/photos")}
        style={styles.openCta}
      >
        <Text style={styles.openCtaText}>Open the reel →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: spacing.xs },
  pressable: {
    height: TILE_HEIGHT,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
  },
  slide: { height: TILE_HEIGHT, position: "relative" },
  image: { width: "100%", height: "100%", backgroundColor: colors.surfaceMuted },
  caption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  captionAuthor: {
    color: "#fff",
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  captionText: { color: "#fff", fontSize: fontSize.sm },
  dots: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
  },
  dotOn: { backgroundColor: colors.primary },
  openCta: { alignSelf: "flex-end", paddingVertical: 4 },
  openCtaText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  emptyBlock: { gap: spacing.sm, alignItems: "flex-start" },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyBody: { fontSize: fontSize.sm, color: colors.textMuted, lineHeight: 20 },
});
