"use client";

import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { endCall } from "./actions";

type CallRoomProps = {
  url: string;
  token: string;
  callId: string;
};

/**
 * The actual video-call room. LiveKit's <VideoConference> is a
 * pre-built layout (grid of tiles + control bar + audio renderer).
 * On disconnect we mark the call completed and land on
 * /post-call/[callId].
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
        onDisconnected={async () => {
          // Fire-and-forget the status update; navigation shouldn't wait.
          endCall(callId).catch(() => {});
          router.push(`/post-call/${callId}`);
        }}
        style={{ height: "100%" }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
