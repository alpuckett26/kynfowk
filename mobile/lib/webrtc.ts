import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  type MediaStream,
} from "react-native-webrtc";

export const ROOM_CAP = 6;

export interface IceServer {
  urls: string;
  username?: string;
  credential?: string;
}

export type SDPSignal = { type: "offer" | "answer"; sdp: string };

export type SignalMessage =
  | { type: "offer"; from: string; to: string; sdp: SDPSignal }
  | { type: "answer"; from: string; to: string; sdp: SDPSignal }
  | { type: "ice"; from: string; to: string; candidate: RTCIceCandidateInitLike };

export type RTCIceCandidateInitLike = {
  candidate: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
};

export function buildIceServers(): IceServer[] {
  const servers: IceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];
  const turnUrl = process.env.EXPO_PUBLIC_TURN_URL;
  const turnUser = process.env.EXPO_PUBLIC_TURN_USERNAME;
  const turnCred = process.env.EXPO_PUBLIC_TURN_CREDENTIAL;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
  }
  return servers;
}

export async function getLocalMedia(): Promise<MediaStream> {
  return mediaDevices.getUserMedia({
    audio: true,
    video: { facingMode: "user" },
  }) as Promise<MediaStream>;
}

export function applyOffer(pc: RTCPeerConnection, sdp: SDPSignal): Promise<void> {
  return pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

export function applyAnswer(pc: RTCPeerConnection, sdp: SDPSignal): Promise<void> {
  return pc.setRemoteDescription(new RTCSessionDescription(sdp));
}

export function applyIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInitLike
): Promise<void> {
  return pc.addIceCandidate(
    new RTCIceCandidate({
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex ?? undefined,
      sdpMid: candidate.sdpMid ?? undefined,
    })
  );
}

export { RTCPeerConnection };
