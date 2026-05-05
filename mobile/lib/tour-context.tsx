import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import { router } from "expo-router";

const STORAGE_KEY = "tour:v1:completed";
const MEASURE_DELAY_MS = 400; // wait for nav transition before measuring

export type SpotlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TourStep = {
  id: string;
  title: string;
  body: string;
  route?: string;
};

const STEPS: TourStep[] = [
  {
    id: "home-reel",
    title: "The Family Reel",
    body: "Photos and moments shared by your whole circle. Scroll through to see what everyone's been up to.",
    route: "/(tabs)/",
  },
  {
    id: "home-readiness",
    title: "Circle Readiness",
    body: "See how many members have shared their availability. The more connected, the better the suggested call times.",
  },
  {
    id: "home-schedule",
    title: "Schedule a Call",
    body: "Tap Schedule to book your next family call — the app finds windows that work for everyone in the circle.",
  },
  {
    id: "schedule-grid",
    title: "Set Your Availability",
    body: "Tap any block to mark when you're free. Your circle's overlapping times drive the best call suggestions.",
    route: "/(tabs)/schedule",
  },
  {
    id: "family-invite",
    title: "Invite Your Family",
    body: "Add grandparents, siblings, cousins — anyone who matters. They'll get an invite to join your circle.",
    route: "/(tabs)/family",
  },
];

type TourContextValue = {
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  spotlightRect: SpotlightRect | null;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
  registerTarget: (stepId: string, ref: View | null) => void;
};

const TourContext = createContext<TourContextValue>({
  currentStep: null,
  stepIndex: -1,
  totalSteps: STEPS.length,
  spotlightRect: null,
  startTour: () => {},
  nextStep: () => {},
  skipTour: () => {},
  registerTarget: () => {},
});

export function useTour() {
  return useContext(TourContext);
}

/** Attach the returned ref to any View to register it as a tour target. */
export function useTourTarget(stepId: string) {
  const { registerTarget } = useTour();
  const ref = useRef<View>(null);

  useEffect(() => {
    // Small delay so the component has mounted and laid out
    const t = setTimeout(() => {
      registerTarget(stepId, ref.current);
    }, 50);
    return () => {
      clearTimeout(t);
      registerTarget(stepId, null);
    };
  // registerTarget is stable (no deps), safe to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId]);

  return ref;
}

export function TourProvider({ children }: { children: React.JSX.Element | React.JSX.Element[] }) {
  const [stepIndex, setStepIndex] = useState(-1);
  const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);

  const refsMap = useRef<Map<string, View>>(new Map());
  const measureTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const stepIndexRef = useRef(-1);

  // Keep stepIndexRef in sync
  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  const measureStep = useCallback((index: number) => {
    clearTimeout(measureTimer.current);
    measureTimer.current = setTimeout(() => {
      const step = STEPS[index];
      if (!step) return;
      const ref = refsMap.current.get(step.id);
      if (!ref) {
        setSpotlightRect(null);
        return;
      }
      ref.measure((_x, _y, width, height, pageX, pageY) => {
        if (width === 0 && height === 0) {
          // Element not laid out yet — retry once
          setTimeout(() => {
            ref.measure((_x2, _y2, w2, h2, px2, py2) => {
              setSpotlightRect({ x: px2, y: py2, width: w2, height: h2 });
            });
          }, 200);
          return;
        }
        setSpotlightRect({ x: pageX, y: pageY, width, height });
      });
    }, MEASURE_DELAY_MS);
  }, []);

  /** Called by useTourTarget when a component mounts or unmounts */
  const registerTarget = useCallback(
    (stepId: string, ref: View | null) => {
      if (ref) {
        refsMap.current.set(stepId, ref);
        // If this step is currently active, measure immediately
        const idx = stepIndexRef.current;
        if (idx >= 0 && STEPS[idx]?.id === stepId) {
          measureStep(idx);
        }
      } else {
        refsMap.current.delete(stepId);
      }
    },
    [measureStep]
  );

  // Navigate + measure whenever step changes
  useEffect(() => {
    if (stepIndex < 0) return;
    const step = STEPS[stepIndex];
    if (!step) return;
    setSpotlightRect(null);
    if (step.route) {
      router.navigate(step.route as Parameters<typeof router.navigate>[0]);
    }
    measureStep(stepIndex);
  }, [stepIndex, measureStep]);

  const complete = useCallback(() => {
    setStepIndex(-1);
    setSpotlightRect(null);
    void AsyncStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const startTour = useCallback(() => {
    setStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    const next = stepIndexRef.current + 1;
    if (next >= STEPS.length) {
      complete();
    } else {
      setStepIndex(next);
    }
  }, [complete]);

  const skipTour = useCallback(() => {
    complete();
  }, [complete]);

  useEffect(() => () => clearTimeout(measureTimer.current), []);

  return (
    <TourContext.Provider
      value={{
        currentStep: stepIndex >= 0 ? (STEPS[stepIndex] ?? null) : null,
        stepIndex,
        totalSteps: STEPS.length,
        spotlightRect,
        startTour,
        nextStep,
        skipTour,
        registerTarget,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

/** Call once the dashboard loads. Starts tour if not yet seen. */
export async function maybeStartTour(startTour: () => void) {
  const done = await AsyncStorage.getItem(STORAGE_KEY);
  if (!done) startTour();
}
