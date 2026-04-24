"use client";

import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

type CallRoomProps = {
  url: string;
  token: string;
  callId: string;
};

/**
 * The actual video-call room. LiveKit's <VideoConference> is a
 * pre-built layout (grid of tiles + control bar + audio renderer).
 * On disconnect we land on /post-call/[callId].
 */
export function CallRoom({ url, token, callId }: CallRoomProps) {
  const router = useRouter();

  return (
    <div className="h-screen w-full bg-black">
      <LiveKitRoom
        serverUrl={url}
        token={token}
        connect
        video
        audio
        data-lk-theme="default"
        onDisconnected={() => router.push(`/post-call/${callId}`)}
        style={{ height: "100%" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

/**
 * Compact alternate layout — kept for reference / future when we want
 * a custom shell. Currently unused; <VideoConference> above is enough.
 */
export function CustomCallLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  return (
    <>
      <GridLayout tracks={tracks} style={{ height: "calc(100vh - 80px)" }}>
        <ParticipantTile />
      </GridLayout>
      <ControlBar />
      <RoomAudioRenderer />
    </>
  );
}
