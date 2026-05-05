import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTour } from "@/lib/tour-context";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

const PAD = 10; // breathing room around spotlight

export function TourOverlay() {
  const { currentStep, spotlightRect, stepIndex, totalSteps, nextStep, skipTour } =
    useTour();
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fade in when a new step activates
  useEffect(() => {
    if (!currentStep) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [currentStep, fadeAnim]);

  // Pulse the spotlight ring
  useEffect(() => {
    if (!spotlightRect) return;
    pulseAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [spotlightRect, pulseAnim]);

  if (!currentStep) return null;

  const { width: W, height: H } = Dimensions.get("window");
  const isLast = stepIndex === totalSteps - 1;

  if (!spotlightRect) {
    // Navigating / measuring — show dimmed overlay with centered tooltip
    return (
      <Animated.View
        style={[styles.root, { opacity: fadeAnim }]}
        pointerEvents="box-none"
      >
        <View style={[styles.darkRect, { width: W, height: H }]} pointerEvents="auto" />
        <View style={styles.centeredTooltip} pointerEvents="auto">
          <TooltipCard
            step={currentStep}
            stepIndex={stepIndex}
            totalSteps={totalSteps}
            isLast={isLast}
            onNext={nextStep}
            onSkip={skipTour}
          />
        </View>
      </Animated.View>
    );
  }

  const sx = Math.max(0, spotlightRect.x - PAD);
  const sy = Math.max(0, spotlightRect.y - PAD);
  const sw = spotlightRect.width + PAD * 2;
  const sh = spotlightRect.height + PAD * 2;

  const topH = sy;
  const bottomY = sy + sh;
  const bottomH = Math.max(0, H - bottomY);
  const leftW = sx;
  const rightX = sx + sw;
  const rightW = Math.max(0, W - rightX);

  // Show tooltip below spotlight if it's in the top 55% of screen
  const showBelow = sy < H * 0.55;

  const ringOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1],
  });
  const ringScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  return (
    <Animated.View
      style={[styles.root, { opacity: fadeAnim }]}
      pointerEvents="box-none"
    >
      {/* Dark backdrop — four rects leaving spotlight clear */}
      {topH > 0 && (
        <View
          style={[styles.darkRect, { top: 0, left: 0, width: W, height: topH }]}
          pointerEvents="auto"
        />
      )}
      {bottomH > 0 && (
        <View
          style={[styles.darkRect, { top: bottomY, left: 0, width: W, height: bottomH }]}
          pointerEvents="auto"
        />
      )}
      {leftW > 0 && (
        <View
          style={[styles.darkRect, { top: sy, left: 0, width: leftW, height: sh }]}
          pointerEvents="auto"
        />
      )}
      {rightW > 0 && (
        <View
          style={[styles.darkRect, { top: sy, left: rightX, width: rightW, height: sh }]}
          pointerEvents="auto"
        />
      )}

      {/* Pulsing ring around spotlight */}
      <Animated.View
        style={[
          styles.ring,
          {
            top: sy,
            left: sx,
            width: sw,
            height: sh,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
        pointerEvents="none"
      />

      {/* Tooltip */}
      <View
        style={[
          styles.tooltip,
          showBelow ? { top: bottomY + 12 } : { bottom: H - sy + 12 },
        ]}
        pointerEvents="auto"
      >
        <TooltipCard
          step={currentStep}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          isLast={isLast}
          onNext={nextStep}
          onSkip={skipTour}
        />
      </View>
    </Animated.View>
  );
}

function TooltipCard({
  step,
  stepIndex,
  totalSteps,
  isLast,
  onNext,
  onSkip,
}: {
  step: { title: string; body: string };
  stepIndex: number;
  totalSteps: number;
  isLast: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{step.title}</Text>
        <Text style={styles.counter}>{stepIndex + 1} / {totalSteps}</Text>
      </View>
      <Text style={styles.cardBody}>{step.body}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.nextBtn} onPress={onNext}>
          <Text style={styles.nextBtnText}>{isLast ? "Done ✓" : "Got it →"}</Text>
        </Pressable>
        {!isLast && (
          <Pressable onPress={onSkip} hitSlop={8}>
            <Text style={styles.skipText}>Skip tour</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  darkRect: {
    position: "absolute",
    backgroundColor: "rgba(10,8,6,0.72)",
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: radius.lg,
  },
  tooltip: {
    position: "absolute",
    left: spacing.xl,
    right: spacing.xl,
  },
  centeredTooltip: {
    position: "absolute",
    top: "38%",
    left: spacing.xl,
    right: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  counter: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    fontWeight: fontWeight.medium,
  },
  cardBody: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  nextBtnText: {
    color: colors.primaryText,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  skipText: {
    fontSize: fontSize.sm,
    color: colors.textSubtle,
  },
});
