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
import { GameTrivia, type TriviaAction } from "@/components/GameTrivia";
import {
  GameWordChain,
  type WordChainAction,
} from "@/components/GameWordChain";
import { ApiError } from "@/lib/api";
import { completeCall, fetchCallDetail } from "@/lib/calls";
import {
  endGameSession,
  fetchGameCatalog,
  startGameSession,
} from "@/lib/games";
import { supabase } from "@/lib/supabase";
import type { GameCatalogEntry } from "@/types/api";
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

  // Presence-based auto-complete tracking (M78)
  const allPeersEverRef = useRef<Set<string>>(new Set());
  const callStartedAtRef = useRef<number>(Date.now());
  const hasJoinedRef = useRef(false);
  const completedRef = useRef(false);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [roomFull, setRoomFull] = useState(false);
  const [phase, setPhase] = useState<"connecting" | "ready" | "error">("connecting");

  // Games (M11)
  type GamePeer = { membershipId: string; displayName: string };
  type GameMode =
    | { kind: "idle" }
    | { kind: "picking"; catalog: GameCatalogEntry[]; loading: boolean }
    | {
        kind: "playing";
        gameId: string;
        isHost: boolean;
        peers: GamePeer[];
        sessionId: string | null;
        startedAt: number;
      };
  const [gameMode, setGameMode] = useState<GameMode>({ kind: "idle" });
  const gameHandlerRef = useRef<((payload: unknown) => void) | null>(null);

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
        callStartedAtRef.current = detail.snapshot.call.actual_started_at
          ? new Date(detail.snapshot.call.actual_started_at).getTime()
          : Date.now();
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
          allPeersEverRef.current.add(remoteId); // track for auto-complete attendance
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

      channel.on("broadcast", { event: "game_event" }, ({ payload }) => {
        if (!active) return;
        gameHandlerRef.current?.(payload);
      });

      channel.on("broadcast", { event: "game_invite" }, ({ payload }) => {
        if (!active) return;
        const p = payload as {
          gameId: string;
          hostId: string;
          peers: GamePeer[];
        };
        if (p.hostId === myId) return;
        setGameMode({
          kind: "playing",
          gameId: p.gameId,
          isHost: false,
          peers: p.peers,
          sessionId: null,
          startedAt: Date.now(),
        });
      });

      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && active) {
          await channel.track({ membership_id: myId, display_name: myName });
          hasJoinedRef.current = true;
          allPeersEverRef.current.add(myId); // count self as attended
          setPhase("ready");
        }
      });
    })();

    return () => {
      active = false;

      // Auto-complete when the last person leaves (handles navigation-away
      // and app-kill paths that bypass the Leave button).
      if (
        !completedRef.current &&
        hasJoinedRef.current &&
        peersRef.current.size === 0
      ) {
        completedRef.current = true;
        const durationMinutes = Math.max(
          1,
          Math.round((Date.now() - callStartedAtRef.current) / 60_000)
        );
        void completeCall(callId as string, {
          durationMinutes,
          attendedMembershipIds: [...allPeersEverRef.current],
        }).catch(() => {/* best-effort */});
      }

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
        onPress: async () => {
          // Auto-complete when we're the last person in the room.
          // If others are still present they'll complete it when they leave.
          if (
            !completedRef.current &&
            hasJoinedRef.current &&
            peersRef.current.size === 0
          ) {
            completedRef.current = true;
            const durationMinutes = Math.max(
              1,
              Math.round((Date.now() - callStartedAtRef.current) / 60_000)
            );
            try {
              await completeCall(callId as string, {
                durationMinutes,
                attendedMembershipIds: [...allPeersEverRef.current],
              });
            } catch {
              // best-effort — stale-live cleanup will catch it after 6h
            }
          }
          router.back();
        },
      },
    ]);
  };

  // ── Games ────────────────────────────────────────────────────────────────

  const sendGameEvent = useCallback((payload: unknown) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "game_event",
      payload,
    });
  }, []);

  const onGameMessage = useCallback((handler: (payload: unknown) => void) => {
    gameHandlerRef.current = handler;
    return () => {
      gameHandlerRef.current = null;
    };
  }, []);

  const openGamePicker = async () => {
    setGameMode({ kind: "picking", catalog: [], loading: true });
    try {
      const res = await fetchGameCatalog();
      setGameMode({ kind: "picking", catalog: res.games, loading: false });
    } catch {
      setGameMode({ kind: "idle" });
      Alert.alert("Couldn't load games", "Try again in a moment.");
    }
  };

  const startGame = async (game: GameCatalogEntry) => {
    if (state.kind !== "ready") return;
    const peers: GamePeer[] = [
      { membershipId: state.membershipId, displayName: state.displayName },
      ...Array.from(peersRef.current.values()).map((p) => ({
        membershipId: p.membershipId,
        displayName: p.displayName,
      })),
    ];
    const startedAt = Date.now();
    setGameMode({
      kind: "playing",
      gameId: game.id,
      isHost: true,
      peers,
      sessionId: null,
      startedAt,
    });
    channelRef.current?.send({
      type: "broadcast",
      event: "game_invite",
      payload: { gameId: game.id, hostId: state.membershipId, peers },
    });
    try {
      const res = await startGameSession({
        callId: callId as string,
        gameId: game.id,
        participantMembershipIds: peers.map((p) => p.membershipId),
      });
      setGameMode((prev) =>
        prev.kind === "playing"
          ? { ...prev, sessionId: res.sessionId }
          : prev
      );
    } catch {
      // Session logging is best-effort; the game still runs.
    }
  };

  const endGame = async () => {
    if (gameMode.kind !== "playing") {
      setGameMode({ kind: "idle" });
      return;
    }
    const sessionId = gameMode.sessionId;
    const duration = Math.floor((Date.now() - gameMode.startedAt) / 1000);
    setGameMode({ kind: "idle" });
    gameHandlerRef.current = null;
    if (sessionId) {
      try {
        await endGameSession(sessionId, duration);
      } catch {
        // best-effort
      }
    }
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
        <Pressable
          style={[styles.iconBtn, gameMode.kind !== "idle" && styles.iconBtnActive]}
          onPress={openGamePicker}
          disabled={gameMode.kind !== "idle"}
        >
          <Text style={styles.iconText}>🎮</Text>
        </Pressable>
        <Pressable style={styles.leaveBtn} onPress={onLeave}>
          <Text style={styles.leaveBtnText}>Leave</Text>
        </Pressable>
      </View>

      {gameMode.kind === "picking" ? (
        <View style={styles.gameOverlay}>
          <Card>
            <View style={styles.gamePickerHeader}>
              <Text style={styles.gamePickerTitle}>Pick a game</Text>
              <Pressable
                onPress={() => setGameMode({ kind: "idle" })}
                style={styles.gamePickerClose}
              >
                <Text style={styles.gamePickerCloseText}>✕</Text>
              </Pressable>
            </View>
            {gameMode.loading ? (
              <Text style={styles.gameLoading}>Loading…</Text>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {gameMode.catalog.map((g) => (
                  <Pressable
                    key={g.id}
                    style={styles.gameCard}
                    onPress={() => startGame(g)}
                  >
                    <Text style={styles.gameCardIcon}>
                      {g.category === "trivia"
                        ? "🎯"
                        : g.category === "word"
                          ? "📝"
                          : "🎮"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gameCardName}>{g.name}</Text>
                      {g.description ? (
                        <Text style={styles.gameCardDesc} numberOfLines={2}>
                          {g.description}
                        </Text>
                      ) : null}
                      <Text style={styles.gameCardMeta}>
                        {g.duration_label} · {g.min_players}–{g.max_players}{" "}
                        players
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
        </View>
      ) : null}

      {gameMode.kind === "playing" ? (
        <View style={styles.gameOverlay}>
          {gameMode.gameId === "trivia" ? (
            <GameTrivia
              membershipId={state.membershipId}
              isHost={gameMode.isHost}
              players={gameMode.peers}
              onSend={(action) => sendGameEvent(action)}
              onMessage={(handler) =>
                onGameMessage((p) => handler(p as TriviaAction))
              }
              onEnd={endGame}
            />
          ) : gameMode.gameId === "word_chain" ? (
            <GameWordChain
              membershipId={state.membershipId}
              isHost={gameMode.isHost}
              players={gameMode.peers}
              onSend={(action) => sendGameEvent(action)}
              onMessage={(handler) =>
                onGameMessage((p) => handler(p as WordChainAction))
              }
              onEnd={endGame}
            />
          ) : (
            <Card>
              <Text>Unsupported game</Text>
              <Button label="End" variant="ghost" onPress={endGame} />
            </Card>
          )}
        </View>
      ) : null}
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
  iconBtnActive: { backgroundColor: colors.accent + "22", borderColor: colors.accent },
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
  gameOverlay: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md + 80,
    top: spacing.md + 80,
    justifyContent: "center",
  },
  gamePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gamePickerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  gamePickerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  gamePickerCloseText: { fontSize: fontSize.md, color: colors.text },
  gameLoading: { fontSize: fontSize.sm, color: colors.textMuted },
  gameCard: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    alignItems: "center",
  },
  gameCardIcon: { fontSize: 28 },
  gameCardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  gameCardDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 19,
  },
  gameCardMeta: {
    fontSize: fontSize.xs,
    color: colors.textSubtle,
    marginTop: 4,
  },
});

// silence unused warning if Platform isn't referenced
void Platform;
