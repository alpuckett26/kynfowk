"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { callJoinedAction, callLeftAction, startGameSessionAction, endGameSessionAction } from "@/app/actions";
import { GamePicker } from "@/components/game-picker";
import { GameTrivia } from "@/components/game-trivia";
import { GameWordChain } from "@/components/game-word-chain";
import type { GameCatalogEntry } from "@/lib/data";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface CallRoomProps {
  callId: string;
  callTitle: string;
  familyCircleId: string;
  membershipId: string;
  displayName: string;
  gameSuggestions: GameCatalogEntry[];
}

interface PeerState {
  membershipId: string;
  displayName: string;
  stream: MediaStream | null;
  connection: RTCPeerConnection;
}

// Hard cap: mesh topology becomes unusable beyond this.
const ROOM_CAP = 6;

// ICE servers: STUN for dev, TURN env vars for production.
// Set NEXT_PUBLIC_TURN_URL / NEXT_PUBLIC_TURN_USERNAME / NEXT_PUBLIC_TURN_CREDENTIAL
// in Vercel environment variables to enable TURN.
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ];

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred
    });
  }

  return servers;
}

type SignalMessage =
  | { type: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; from: string; to: string; candidate: RTCIceCandidateInit };

export function CallRoom({
  callId,
  callTitle,
  familyCircleId,
  membershipId,
  displayName,
  gameSuggestions
}: CallRoomProps) {
  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerState>>(new Map());
  const channelRef = useRef<ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null>(null);
  // Track attendance event ID so we can update left_at on leave
  const attendanceEventIdRef = useRef<string | null>(null);
  const hasJoinedRef = useRef(false);

  const [peers, setPeers] = useState<Map<string, PeerState>>(new Map());
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [roomFull, setRoomFull] = useState(false);
  const [status, setStatus] = useState<"connecting" | "ready" | "error">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  type GameMode = "idle" | "picking" | "playing";
  type GameBroadcastPayload = { type: string; [key: string]: unknown };

  const [gameMode, setGameMode] = useState<GameMode>("idle");
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [gameSessionId, setGameSessionId] = useState<string | null>(null);
  const [gameSessionStart, setGameSessionStart] = useState<number>(0);
  const [gamePeers, setGamePeers] = useState<Array<{ membershipId: string; displayName: string }>>([]);
  const [isGameHost, setIsGameHost] = useState(false);
  const gameHandlerRef = useRef<((payload: GameBroadcastPayload) => void) | null>(null);

  const syncPeers = useCallback(() => {
    setPeers(new Map(peersRef.current));
  }, []);

  const createPeerConnection = useCallback(
    (remoteMembershipId: string, remoteDisplayName: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
      const remoteStream = new MediaStream();

      pc.onicecandidate = ({ candidate }) => {
        if (!candidate || !channelRef.current) return;
        channelRef.current.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "ice",
            from: membershipId,
            to: remoteMembershipId,
            candidate: candidate.toJSON()
          } satisfies SignalMessage
        });
      };

      pc.ontrack = ({ track }) => {
        remoteStream.addTrack(track);
        const existing = peersRef.current.get(remoteMembershipId);
        if (existing) {
          peersRef.current.set(remoteMembershipId, { ...existing, stream: remoteStream });
          syncPeers();
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          peersRef.current.delete(remoteMembershipId);
          syncPeers();
        }
      };

      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getTracks()) {
          pc.addTrack(track, localStreamRef.current);
        }
      }

      peersRef.current.set(remoteMembershipId, {
        membershipId: remoteMembershipId,
        displayName: remoteDisplayName,
        stream: null,
        connection: pc
      });
      syncPeers();

      return pc;
    },
    [membershipId, syncPeers]
  );

  const initiateOffer = useCallback(
    async (remoteMembershipId: string, remoteDisplayName: string) => {
      const pc = createPeerConnection(remoteMembershipId, remoteDisplayName);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channelRef.current?.send({
        type: "broadcast",
        event: "signal",
        payload: {
          type: "offer",
          from: membershipId,
          to: remoteMembershipId,
          sdp: offer
        } satisfies SignalMessage
      });
    },
    [createPeerConnection, membershipId]
  );

  const handleSignal = useCallback(
    async (msg: SignalMessage) => {
      if (msg.to !== membershipId) return;

      if (msg.type === "offer") {
        let peer = peersRef.current.get(msg.from);
        if (!peer) {
          createPeerConnection(msg.from, "Family member");
          peer = peersRef.current.get(msg.from)!;
        }
        await peer.connection.setRemoteDescription(msg.sdp);
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);
        channelRef.current?.send({
          type: "broadcast",
          event: "signal",
          payload: {
            type: "answer",
            from: membershipId,
            to: msg.from,
            sdp: answer
          } satisfies SignalMessage
        });
      } else if (msg.type === "answer") {
        const peer = peersRef.current.get(msg.from);
        if (peer) await peer.connection.setRemoteDescription(msg.sdp);
      } else if (msg.type === "ice") {
        const peer = peersRef.current.get(msg.from);
        if (peer) await peer.connection.addIceCandidate(msg.candidate);
      }
    },
    [membershipId, createPeerConnection]
  );

  // While the call-room is mounted, hide the global SiteHeader, Chyron,
  // MobileBottomNav, and ChatWidget so the call takes the full viewport.
  // Without this the "Leave" button at the bottom of .call-room-controls
  // gets pushed off-screen by the SiteHeader/Chyron above and overlapped
  // by the fixed bottom nav + chat widget below — i.e. no way to hang up.
  useEffect(() => {
    document.body.classList.add("in-call");
    return () => {
      document.body.classList.remove("in-call");
    };
  }, []);

  useEffect(() => {
    let active = true;
    const peers = peersRef.current;

    async function setup() {
      // Get local media
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        setStatus("error");
        setErrorMessage("Camera or microphone access was denied. Please allow access and reload.");
        return;
      }
      if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // Persist join event in DB + mark attendance
      if (!hasJoinedRef.current) {
        hasJoinedRef.current = true;
        const result = await callJoinedAction(callId, familyCircleId, membershipId);
        if (result?.attendanceEventId) {
          attendanceEventIdRef.current = result.attendanceEventId;
        }
      }

      // Build a private Realtime channel scoped to this call
      // Supabase will validate the JWT automatically — only authenticated
      // users in the same family circle can subscribe (enforced by RLS on
      // the broadcast/presence read path once Realtime Auth is enabled).
      const supabase = createSupabaseBrowserClient();
      const channel = supabase.channel(`call:${callId}`, {
        config: {
          presence: { key: membershipId },
          broadcast: { self: false, ack: false }
        }
      });
      channelRef.current = channel;

      channel.on("presence", { event: "join" }, ({ newPresences }) => {
        if (!active) return;
        const currentCount = peersRef.current.size + 1; // +1 for self
        for (const presence of newPresences) {
          const remoteId = presence.membership_id as string;
          const remoteName = (presence.display_name as string) ?? "Family member";
          if (remoteId === membershipId) continue;

          if (currentCount >= ROOM_CAP) {
            setRoomFull(true);
            continue;
          }

          if (!peersRef.current.has(remoteId) && membershipId < remoteId) {
            initiateOffer(remoteId, remoteName);
          }
        }
      });

      channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
        if (!active) return;
        for (const presence of leftPresences) {
          const remoteId = presence.membership_id as string;
          const peer = peersRef.current.get(remoteId);
          if (peer) {
            peer.connection.close();
            peersRef.current.delete(remoteId);
            syncPeers();
          }
        }
        setRoomFull(false);
      });

      channel.on("broadcast", { event: "signal" }, ({ payload }) => {
        if (!active) return;
        handleSignal(payload as SignalMessage);
      });

      channel.on("broadcast", { event: "game_event" }, ({ payload }) => {
        if (!active || !gameHandlerRef.current) return;
        gameHandlerRef.current(payload as GameBroadcastPayload);
      });

      channel.on("broadcast", { event: "game_invite" }, ({ payload }) => {
        if (!active) return;
        // Non-host: receive game start invitation
        const p = payload as { gameId: string; hostId: string; peers: Array<{ membershipId: string; displayName: string }> };
        if (p.hostId === membershipId) return; // ignore self
        setGameMode("playing");
        setActiveGameId(p.gameId);
        setIsGameHost(false);
        setGamePeers(p.peers);
      });

      await channel.subscribe(async (channelStatus) => {
        if (channelStatus === "SUBSCRIBED" && active) {
          await channel.track({ membership_id: membershipId, display_name: displayName });
          setStatus("ready");
        }
      });
    }

    setup();

    return () => {
      active = false;
      for (const peer of peers.values()) peer.connection.close();
      peers.clear();
      channelRef.current?.untrack();
      channelRef.current?.unsubscribe();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, [callId, familyCircleId, membershipId, displayName, initiateOffer, handleSignal, syncPeers]);

  function toggleMic() {
    if (!localStreamRef.current) return;
    const enabled = !micOn;
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = enabled; });
    setMicOn(enabled);
  }

  function toggleCamera() {
    if (!localStreamRef.current) return;
    const enabled = !cameraOn;
    localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = enabled; });
    setCameraOn(enabled);
  }

  function sendGameEvent(payload: GameBroadcastPayload) {
    channelRef.current?.send({ type: "broadcast", event: "game_event", payload });
  }

  function onGameMessage(handler: (payload: GameBroadcastPayload) => void) {
    gameHandlerRef.current = handler;
    return () => { gameHandlerRef.current = null; };
  }

  async function openGamePicker() {
    // Build current peers list
    const currentPeers = [
      { membershipId, displayName },
      ...Array.from(peersRef.current.values()).map((p) => ({ membershipId: p.membershipId, displayName: p.displayName }))
    ];
    setGamePeers(currentPeers);
    setGameMode("picking");
  }

  async function startGame(game: GameCatalogEntry) {
    const currentPeers = [
      { membershipId, displayName },
      ...Array.from(peersRef.current.values()).map((p) => ({ membershipId: p.membershipId, displayName: p.displayName }))
    ];
    setGamePeers(currentPeers);
    setActiveGameId(game.id);
    setIsGameHost(true);
    setGameMode("playing");
    const now = Date.now();
    setGameSessionStart(now);
    // Tell other peers to join this game
    channelRef.current?.send({
      type: "broadcast",
      event: "game_invite",
      payload: { gameId: game.id, hostId: membershipId, peers: currentPeers }
    });
    // Log session
    const sessionId = await startGameSessionAction(
      callId,
      familyCircleId,
      game.id,
      currentPeers.map((p) => p.membershipId)
    );
    if (sessionId) setGameSessionId(sessionId);
  }

  async function endGame() {
    if (gameSessionId) {
      const duration = Math.floor((Date.now() - gameSessionStart) / 1000);
      await endGameSessionAction(gameSessionId, duration);
    }
    setGameMode("idle");
    setActiveGameId(null);
    setGameSessionId(null);
    gameHandlerRef.current = null;
  }

  async function leaveCall() {
    await callLeftAction(callId, attendanceEventIdRef.current ?? undefined);
    router.push(`/calls/${callId}`);
  }

  if (status === "error") {
    return (
      <main className="page-shell">
        <div className="container stack-lg">
          <div className="call-room-error">
            <h1>Can&apos;t join call</h1>
            <p className="meta">{errorMessage}</p>
            <button
              className="button button-secondary"
              onClick={() => router.push(`/calls/${callId}`)}
            >
              Back to call details
            </button>
          </div>
        </div>
      </main>
    );
  }

  const peerList = Array.from(peers.values());
  const tileCount = Math.min(peerList.length + 1, 4);

  return (
    <div className="call-room">
      <div className="call-room-header">
        <span className="call-room-title">{callTitle}</span>
        {status === "connecting" && (
          <span className="call-room-status-badge">Connecting…</span>
        )}
        {status === "ready" && peerList.length === 0 && (
          <span className="call-room-status-badge">Waiting for others to join…</span>
        )}
        {roomFull && (
          <span className="call-room-status-badge call-room-status-warning">
            Room full ({ROOM_CAP} max)
          </span>
        )}
        <button
          aria-label="End call"
          className="call-room-end-button"
          onClick={leaveCall}
          type="button"
        >
          <HangUpIcon />
          <span>End</span>
        </button>
      </div>

      <div className={`call-video-grid call-video-grid-${tileCount}`}>
        <div className="call-video-tile call-video-tile-local">
          <video autoPlay muted playsInline ref={localVideoRef} className="call-video" />
          {!cameraOn && (
            <div className="call-video-placeholder">
              <span className="call-video-initials">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <span className="call-video-label">
            {displayName} (you)
            {!micOn && " · Muted"}
            {!cameraOn && " · Camera off"}
          </span>
        </div>

        {peerList.map((peer) => (
          <RemoteVideo key={peer.membershipId} peer={peer} />
        ))}
      </div>

      <div className="call-room-controls">
        <button
          className={`call-control-button ${micOn ? "" : "call-control-button-off"}`}
          onClick={toggleMic}
          title={micOn ? "Mute microphone" : "Unmute microphone"}
        >
          {micOn ? <MicOnIcon /> : <MicOffIcon />}
          <span>{micOn ? "Mute" : "Unmute"}</span>
        </button>

        <button
          className={`call-control-button ${cameraOn ? "" : "call-control-button-off"}`}
          onClick={toggleCamera}
          title={cameraOn ? "Turn off camera" : "Turn on camera"}
        >
          {cameraOn ? <CameraOnIcon /> : <CameraOffIcon />}
          <span>{cameraOn ? "Camera off" : "Camera on"}</span>
        </button>

        <button
          className="call-control-button"
          onClick={openGamePicker}
          title="Play a game"
        >
          <GamepadIcon />
          <span>Games</span>
        </button>

        <button className="call-control-button call-control-button-leave" onClick={leaveCall}>
          <HangUpIcon />
          <span>Leave</span>
        </button>
      </div>

      {gameMode === "picking" && (
        <div className="game-overlay">
          <GamePicker
            suggestions={gameSuggestions}
            participants={gamePeers}
            onSelect={startGame}
            onDismiss={() => setGameMode("idle")}
          />
        </div>
      )}

      {gameMode === "playing" && activeGameId === "trivia" && (
        <div className="game-overlay">
          <GameTrivia
            membershipId={membershipId}
            displayName={displayName}
            isHost={isGameHost}
            players={gamePeers}
            onSend={(payload) => sendGameEvent(payload as GameBroadcastPayload)}
            onMessage={(handler) => onGameMessage(handler as (payload: GameBroadcastPayload) => void)}
            onEnd={endGame}
            sessionStartTime={gameSessionStart}
          />
        </div>
      )}

      {gameMode === "playing" && activeGameId === "word_chain" && (
        <div className="game-overlay">
          <GameWordChain
            membershipId={membershipId}
            displayName={displayName}
            isHost={isGameHost}
            players={gamePeers}
            onSend={(payload) => sendGameEvent(payload as GameBroadcastPayload)}
            onMessage={(handler) => onGameMessage(handler as (payload: GameBroadcastPayload) => void)}
            onEnd={endGame}
          />
        </div>
      )}
    </div>
  );
}

function RemoteVideo({ peer }: { peer: PeerState }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // iOS Safari has a long-standing WebRTC quirk: a <video> element with
  // srcObject reliably plays the video frames but often refuses to
  // produce audio, even when audio tracks are present and the element
  // is unmuted. The pattern that works across Chrome / Firefox / desktop
  // Safari / iOS Safari is to render a *separate* hidden <audio>
  // element, attach the same MediaStream there (or only its audio
  // tracks), and call play() on it after a user gesture. The Accept
  // button click provides that gesture for the recipient; for the
  // caller, the Ring Now button click does.
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    const stream = peer.stream;
    if (!stream) return;

    if (v && v.srcObject !== stream) v.srcObject = stream;
    if (a && a.srcObject !== stream) a.srcObject = stream;

    v?.play().catch(() => undefined);
    a?.play().catch(() => undefined);

    const kick = () => {
      v?.play().catch(() => undefined);
      a?.play().catch(() => undefined);
    };
    stream.addEventListener("addtrack", kick);
    return () => stream.removeEventListener("addtrack", kick);
  }, [peer.stream]);

  return (
    <div className="call-video-tile">
      {peer.stream ? (
        <>
          <video autoPlay muted playsInline ref={videoRef} className="call-video" />
          <audio autoPlay ref={audioRef} className="call-remote-audio" />
        </>
      ) : (
        <div className="call-video-placeholder">
          <span className="call-video-initials">{peer.displayName.charAt(0).toUpperCase()}</span>
        </div>
      )}
      <span className="call-video-label">{peer.displayName}</span>
    </div>
  );
}

function MicOnIcon() {
  return (
    <svg aria-hidden fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="23" />
      <line x1="8" x2="16" y1="23" y2="23" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg aria-hidden fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
      <line x1="1" x2="23" y1="1" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" x2="12" y1="19" y2="23" />
      <line x1="8" x2="16" y1="23" y2="23" />
    </svg>
  );
}

function CameraOnIcon() {
  return (
    <svg aria-hidden fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect height="14" rx="2" ry="2" width="15" x="1" y="5" />
    </svg>
  );
}

function CameraOffIcon() {
  return (
    <svg aria-hidden fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
      <line x1="1" x2="23" y1="1" y2="23" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h3a2 2 0 0 1 2 2v9.34m-7.72-2.06A2 2 0 0 1 13 17H5" />
      <polygon points="23 7 16 12 23 17 23 7" />
    </svg>
  );
}

function HangUpIcon() {
  return (
    <svg aria-hidden fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" transform="rotate(135 12 12)" />
    </svg>
  );
}

function GamepadIcon() {
  return (
    <svg aria-hidden fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20">
      <line x1="6" x2="10" y1="12" y2="12" />
      <line x1="8" x2="8" y1="10" y2="14" />
      <line x1="15" x2="15.01" y1="13" y2="13" />
      <line x1="18" x2="18.01" y1="11" y2="11" />
      <rect height="12" rx="2" width="20" x="2" y="6" />
    </svg>
  );
}
