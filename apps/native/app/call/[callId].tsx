import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  useRoom,
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  AudioTrack,
  RoomEvent,
} from "@livekit/react-native";
import { Room, Track } from "livekit-client";
import { COLORS } from "@/lib/constants";

// In production, fetch a LiveKit token from your server
// (e.g. a Supabase Edge Function or Next.js API route)
const LIVEKIT_URL = process.env.EXPO_PUBLIC_LIVEKIT_URL ?? "";

async function fetchToken(callId: string, participantName: string): Promise<string> {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_APP_URL}/api/livekit-token?callId=${callId}&name=${participantName}`
  );
  const { token } = await res.json();
  return token;
}

function ParticipantTile({
  participant,
  isLocal = false,
}: {
  participant: any;
  isLocal?: boolean;
}) {
  const videoTrack = participant.getTrack(Track.Source.Camera);
  const hasVideo = videoTrack?.isMuted === false;

  return (
    <View style={styles.participantTile}>
      {hasVideo ? (
        <VideoTrack
          trackRef={videoTrack}
          style={StyleSheet.absoluteFillObject}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>
            {participant.name?.[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
      )}
      <View style={styles.nameTag}>
        <Text style={styles.nameTagText}>
          {isLocal ? "You" : participant.name ?? "Guest"}
        </Text>
        {participant.isMicrophoneEnabled === false && (
          <Text style={styles.mutedIcon}>🔇</Text>
        )}
      </View>
    </View>
  );
}

export default function CallScreen() {
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const [connected, setConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const room = useRoom();
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();

  // Connect to LiveKit room on mount
  useEffect(() => {
    let mounted = true;

    async function connect() {
      try {
        const token = await fetchToken(callId, "Demo User");
        await room.connect(LIVEKIT_URL, token);
        await room.localParticipant.enableCameraAndMicrophone();

        if (mounted) {
          setConnected(true);
          timerRef.current = setInterval(() => {
            setCallDurationSec((s) => s + 1);
          }, 1000);
        }
      } catch (err) {
        console.error("LiveKit connection error:", err);
        Alert.alert(
          "Connection failed",
          "Could not join the call. Please try again.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    }

    connect();

    room.on(RoomEvent.ParticipantDisconnected, () => {
      if (remoteParticipants.length === 0) {
        // Last participant left — end call
        handleEndCall();
      }
    });

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      room.disconnect();
    };
  }, [callId]);

  const handleEndCall = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await room.disconnect();
    router.replace(`/post-call/${callId}`);
  }, [callId, room]);

  function toggleMute() {
    setIsMuted((prev) => {
      room.localParticipant.setMicrophoneEnabled(prev);
      return !prev;
    });
  }

  function toggleCamera() {
    setIsCameraOff((prev) => {
      room.localParticipant.setCameraEnabled(prev);
      return !prev;
    });
  }

  function toggleSpeaker() {
    setIsSpeakerOn((prev) => !prev);
    // Platform-specific speaker routing would go here
  }

  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const allParticipants = [
    ...(localParticipant ? [{ p: localParticipant, isLocal: true }] : []),
    ...remoteParticipants.map((p) => ({ p, isLocal: false })),
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Participants grid */}
      <View style={styles.grid}>
        {!connected ? (
          <View style={styles.connectingState}>
            <Text style={styles.connectingEmoji}>📞</Text>
            <Text style={styles.connectingText}>Connecting…</Text>
          </View>
        ) : allParticipants.length === 0 ? (
          <View style={styles.connectingState}>
            <Text style={styles.connectingEmoji}>👋</Text>
            <Text style={styles.connectingText}>Waiting for family to join…</Text>
          </View>
        ) : (
          allParticipants.map(({ p, isLocal }) => (
            <ParticipantTile
              key={p.sid}
              participant={p}
              isLocal={isLocal}
            />
          ))
        )}
      </View>

      {/* Header overlay */}
      <View style={styles.headerOverlay}>
        <View style={styles.durationPill}>
          <View style={styles.liveIndicator} />
          <Text style={styles.durationText}>{formatDuration(callDurationSec)}</Text>
        </View>
        <Text style={styles.participantCount}>
          {allParticipants.length} on the call
        </Text>
      </View>

      {/* Audio tracks (hidden, required for audio playback) */}
      {remoteParticipants.map((p) => {
        const audioTrack = p.getTrack(Track.Source.Microphone);
        return audioTrack ? (
          <AudioTrack key={p.sid} trackRef={audioTrack} />
        ) : null;
      })}

      {/* Controls */}
      <View style={styles.controls}>
        <ControlButton
          icon={isMuted ? "🔇" : "🎤"}
          label={isMuted ? "Unmute" : "Mute"}
          onPress={toggleMute}
          active={!isMuted}
        />
        <ControlButton
          icon={isCameraOff ? "📵" : "📷"}
          label={isCameraOff ? "Camera off" : "Camera on"}
          onPress={toggleCamera}
          active={!isCameraOff}
        />
        <ControlButton
          icon={isSpeakerOn ? "🔊" : "🔈"}
          label="Speaker"
          onPress={toggleSpeaker}
          active={isSpeakerOn}
        />
        <Pressable style={styles.endBtn} onPress={handleEndCall}>
          <Text style={styles.endBtnIcon}>📵</Text>
          <Text style={styles.endBtnLabel}>End</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active: boolean;
}) {
  return (
    <Pressable
      style={[styles.controlBtn, !active && styles.controlBtnOff]}
      onPress={onPress}
    >
      <Text style={styles.controlBtnIcon}>{icon}</Text>
      <Text style={styles.controlBtnLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f" },
  grid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 6,
    paddingTop: Platform.OS === "ios" ? 100 : 80,
    paddingBottom: 130,
  },
  participantTile: {
    flex: 1,
    minWidth: "45%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2d1b69",
  },
  avatarPlaceholderText: {
    fontSize: 48,
    fontWeight: "700",
    color: COLORS.brandLight,
  },
  nameTag: {
    position: "absolute",
    bottom: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  nameTagText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  mutedIcon: { fontSize: 12 },
  headerOverlay: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  durationText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  participantCount: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500",
  },
  connectingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  connectingEmoji: { fontSize: 48 },
  connectingText: { color: "rgba(255,255,255,0.6)", fontSize: 16 },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  controlBtn: {
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 14,
    minWidth: 64,
  },
  controlBtnOff: { backgroundColor: "rgba(255,255,255,0.08)" },
  controlBtnIcon: { fontSize: 22 },
  controlBtnLabel: { color: "#fff", fontSize: 10, fontWeight: "600" },
  endBtn: {
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ef4444",
    borderRadius: 20,
    padding: 14,
    minWidth: 64,
  },
  endBtnIcon: { fontSize: 22 },
  endBtnLabel: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
