import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { RTCView, type MediaStream } from "react-native-webrtc";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ApiError } from "@/lib/api";
import { fetchCallDetail } from "@/lib/calls";
import { supabase } from "@/lib/supabase";
import {
  ROOM_CAP,
  RTCPeerConnection,
  applyAnswer,
  applyIceCandidate,
  applyOffer,
  buildIceServers,
  getLocalMedia,
  type SignalMessage,
} from "@/lib/webrtc";
import { colors, fontSize, fontWeight, radius, spacing } from "@/lib/theme";

interface PeerState {
  membershipId: string;
  displayName: string;
  stream: MediaStream | null;
  connection: RTCPeerConnection;
}

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      callTitle: string;
      membershipId: string;
      displayName: string;
      familyCircleId: string;
    };

export default function LiveCallScreen() {
  const { callId } = useLocalSearchParams<{ callId: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [, setRender] = useState(0);
  const forceRender = useCallback(() => setRender((n) => n + 1), []);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const ownIdRef = useRef<string | null>(null);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [roomFull, setRoomFull] = useState(false);
  const [phase, setPhase] = useState<"connecting" | "ready" | "error">("connecting");

  // Bootstrap: fetch viewer + call info, then start media + signaling.
  useEffect(() => {
    let active = true;

    (async () => {
      if (!callId) {
        setState({ kind: "error", message: "Missing call id" });
        return;
      }

      try {
        const detail = await fetchCallDetail(callId);
        if (!active) return;
        setState({
          kind: "ready",
          callTitle: detail.snapshot.call.title,
          membershipId: detail.snapshot.viewerMembershipId,
          displayName: "You",
          familyCircleId: detail.snapshot.circle.id,
        });
        ownIdRef.current = detail.snapshot.viewerMembershipId;
      } catch (e) {
        if (!active) return;
        const m =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Couldn't load call";
        setState({ kind: "error", message: m });
      }
    })();

    return () => {
      active = false;
    };
  }, [callId]);

  // Wire signaling + media once we have viewer info.
  useEffect(() => {
    if (state.kind !== "ready") return;

    const myId = state.membershipId;
    const myName = state.displayName;
    let active = true;

    const createPeer = (remoteId: string, remoteName: string): PeerState => {
      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });

      // @ts-ignore - RN webrtc types differ slightly
      pc.addEventListener("icecandidate", ({ candidate }: { candidate: RTCIceCandidate | null }) => {
        if (!candidate || !channelRef.current) return;
        const json = (candidate as unknown as { toJSON?: () => RTCIceCandidateInit })
          .toJSON?.();
        const candidateStr =
          json?.candidate ??
          (candidate as unknown as { candidate?: string }).candidate ??
          "";
        if (!candidateStr) return;
        channelRef.current.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "ice",
            from: myId,
            to: remoteId,
            candidate: {
              candidate: candidateStr,
              sdpMLineIndex:
                json?.sdpMLineIndex ??
                (candidate as unknown as { sdpMLineIndex?: number }).sdpMLineIndex ??
                null,
              sdpMid:
                json?.sdpMid ??
                (candidate as unknown as { sdpMid?: string }).sdpMid ??
                null,
            },
          } satisfies SignalMessage,
        });
      });

      // @ts-ignore - RN webrtc track event
      pc.addEventListener("track", (event: { streams: MediaStream[] }) => {
        const remoteStream = event.streams[0];
        const peer = peersRef.current.get(remoteId);
        if (peer) {
          peer.stream = remoteStream;
          peersRef.current.set(remoteId, peer);
          forceRender();
        }
      });

      // Add local tracks to the peer
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          // @ts-ignore RN webrtc allows MediaStreamTrack | MediaStream args
          pc.addTrack(track, localStreamRef.current);
        }
      }

      const peer: PeerState = {
        membershipId: remoteId,
        displayName: remoteName,
        stream: null,
        connection: pc,
      };
      peersRef.current.set(remoteId, peer);
      forceRender();
      return peer;
    };

    const initiateOffer = async (remoteId: string, remoteName: string) => {
      const peer =
        peersRef.current.get(remoteId) ?? createPeer(remoteId, remoteName);
      const offer = await peer.connection.createOffer({});
      await peer.connection.setLocalDescription(offer);
      channelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: {
          type: "offer",
          from: myId,
          to: remoteId,
          sdp: { type: "offer", sdp: offer.sdp ?? "" },
        } satisfies SignalMessage,
      });
    };

    const handleSignal = async (msg: SignalMessage) => {
      if (msg.to !== myId) return;
      if (msg.type === "offer") {
        const peer =
          peersRef.current.get(msg.from) ?? createPeer(msg.from, "Family member");
        await applyOffer(peer.connection, msg.sdp);
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);
        channelRef.current?.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "answer",
            from: myId,
            to: msg.from,
            sdp: { type: "answer", sdp: answer.sdp ?? "" },
          } satisfies SignalMessage,
        });
      } else if (msg.type === "answer") {
        const peer = peersRef.current.get(msg.from);
        if (peer) await applyAnswer(peer.connection, msg.sdp);
      } else if (msg.type === "ice") {
        const peer = peersRef.current.get(msg.from);
        if (peer) await applyIceCandidate(peer.connection, msg.candidate);
      }
    };

    (async () => {
      try {
        const stream = await getLocalMedia();
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        forceRender();
      } catch {
        setPhase("error");
        return;
      }

      const channel = supabase.channel(`call:${callId}`, {
        config: {
          presence: { key: myId },
          broadcast: { self: false, ack: false },
        },
      });
      channelRef.current = channel;

      channel.on("presence", { event: "join" }, ({ newPresences }) => {
        if (!active) return;
        const currentCount = peersRef.current.size + 1;
        for (const presence of newPresences) {
          const remoteId = (presence as { membership_id?: string }).membership_id;
          const remoteName =
            (presence as { display_name?: string }).display_name ?? "Family member";
          if (!remoteId || remoteId === myId) continue;
          if (currentCount >= ROOM_CAP) {
            setRoomFull(true);
            continue;
          }
          // Tie-break: smaller id initiates so both sides don't both create.
          if (!peersRef.current.has(remoteId) && myId < remoteId) {
            void initiateOffer(remoteId, remoteName);
          }
        }
      });

      channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
        if (!active) return;
        for (const presence of leftPresences) {
          const remoteId = (presence as { membership_id?: string }).membership_id;
          if (!remoteId) continue;
          const peer = peersRef.current.get(remoteId);
          if (peer) {
            peer.connection.close();
            peersRef.current.delete(remoteId);
            forceRender();
          }
        }
        setRoomFull(false);
      });

      channel.on("broadcast", { event: "signal" }, ({ payload }) => {
        if (!active) return;
        void handleSignal(payload as SignalMessage);
      });

      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && active) {
          await channel.track({ membership_id: myId, display_name: myName });
          setPhase("ready");
        }
      });
    })();

    return () => {
      active = false;
      for (const peer of peersRef.current.values()) {
        try {
          peer.connection.close();
        } catch {
          /* noop */
        }
      }
      peersRef.current.clear();
      channelRef.current?.untrack();
      channelRef.current?.unsubscribe();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, [state, callId, forceRender]);

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const next = !micOn;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
    setMicOn(next);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const next = !cameraOn;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
    setCameraOn(next);
  };

  const onLeave = () => {
    Alert.alert("Leave call?", "", [
      { text: "Stay", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => router.back(),
      },
    ]);
  };

  if (state.kind === "loading") {
    return (
      <Screen scroll={false}>
        <EmptyState title="Joining call…" />
      </Screen>
    );
  }
  if (state.kind === "error") {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState title="Couldn't join" description={state.message} />
      </Screen>
    );
  }

  if (phase === "error") {
    return (
      <Screen>
        <View style={styles.headerRow}>
          <Button label="← Back" variant="ghost" onPress={() => router.back()} />
        </View>
        <EmptyState
          title="Camera or microphone access denied"
          description="Open the system settings for Kynfowk and allow camera + microphone, then re-join."
        />
      </Screen>
    );
  }

  const peerEntries = Array.from(peersRef.current.values());

  return (
    <Screen scroll={false}>
      <View style={styles.headerRow}>
        <Button label="← Back" variant="ghost" onPress={() => router.back()} />
      </View>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Live</Text>
        <Text style={styles.title} numberOfLines={1}>
          {state.callTitle}
        </Text>
        <Text style={styles.lede}>
          {phase === "connecting"
            ? "Connecting…"
            : `${peerEntries.length + 1} on the call`}
        </Text>
      </View>

      <View style={styles.gallery}>
        <View style={styles.tile}>
          {localStreamRef.current ? (
            <RTCView
              streamURL={
                (localStreamRef.current as unknown as { toURL: () => string }).toURL()
              }
              style={styles.video}
              objectFit="cover"
              mirror
            />
          ) : (
            <View style={[styles.video, styles.tilePlaceholder]} />
          )}
          <View style={styles.label}>
            <Text style={styles.labelText}>You</Text>
          </View>
        </View>
        {peerEntries.map((peer) => (
          <View key={peer.membershipId} style={styles.tile}>
            {peer.stream ? (
              <RTCView
                streamURL={(peer.stream as unknown as { toURL: () => string }).toURL()}
                style={styles.video}
                objectFit="cover"
              />
            ) : (
              <View style={[styles.video, styles.tilePlaceholder]} />
            )}
            <View style={styles.label}>
              <Text style={styles.labelText} numberOfLines={1}>
                {peer.displayName}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {roomFull ? (
        <Card>
          <Text style={styles.warn}>
            Room is full ({ROOM_CAP} max). Newer joiners are queued.
          </Text>
        </Card>
      ) : null}

      <View style={styles.controls}>
        <Pressable
          style={[styles.iconBtn, !micOn && styles.iconBtnOff]}
          onPress={toggleMic}
        >
          <Text style={styles.iconText}>{micOn ? "🎤" : "🔇"}</Text>
        </Pressable>
        <Pressable
          style={[styles.iconBtn, !cameraOn && styles.iconBtnOff]}
          onPress={toggleCamera}
        >
          <Text style={styles.iconText}>{cameraOn ? "📹" : "🚫"}</Text>
        </Pressable>
        <Pressable style={styles.leaveBtn} onPress={onLeave}>
          <Text style={styles.leaveBtnText}>Leave</Text>
        </Pressable>
      </View>
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
    color: colors.liveDot,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  lede: { fontSize: fontSize.sm, color: colors.textMuted },
  gallery: {
    flex: 1,
    gap: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    marginVertical: spacing.md,
  },
  tile: {
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 200,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.text,
    position: "relative",
  },
  tilePlaceholder: { backgroundColor: colors.text },
  video: { flex: 1 },
  label: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  labelText: {
    color: "#fff",
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  warn: { fontSize: fontSize.sm, color: colors.warning },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.lg,
  },
  iconBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  iconBtnOff: { backgroundColor: colors.dangerBg, borderColor: colors.danger },
  iconText: { fontSize: 24 },
  leaveBtn: {
    backgroundColor: colors.liveDot,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.pill,
  },
  leaveBtnText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});

// silence unused warning if Platform isn't referenced
void Platform;
