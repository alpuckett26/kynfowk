import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import type { CallDetailParticipant } from "@/lib/types";

const AVATAR_COLORS = ["#c7663f", "#7c6af7", "#0ea5e9", "#d97706", "#16a34a", "#db2777"];

function tileColor(name: string) {
  const i = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CallVideoPreview({
  callId,
  callTitle,
  isLive,
  participants,
}: {
  callId: string;
  callTitle: string;
  isLive: boolean;
  participants: CallDetailParticipant[];
}) {
  // Show up to 4 tiles; add a "+N" overflow tile if more
  const shown = participants.slice(0, 4);
  const overflow = participants.length - shown.length;

  const gridClass =
    shown.length === 1
      ? "cvp-grid-1"
      : shown.length === 2
        ? "cvp-grid-2"
        : "cvp-grid-3plus";

  return (
    <div className="cvp-shell">
      {/* Simulated camera-off dark room */}
      <div className={`cvp-grid ${gridClass}`}>
        {shown.map((p) => (
          <div className="cvp-tile" key={p.membershipId}>
            {p.avatarUrl ? (
              <Image
                alt={p.displayName}
                className="cvp-tile-photo"
                fill
                src={p.avatarUrl}
                style={{ objectFit: "cover" }}
                unoptimized
              />
            ) : (
              <div
                className="cvp-tile-initials"
                style={{ background: tileColor(p.displayName) }}
              >
                {initials(p.displayName)}
              </div>
            )}
            <span className="cvp-tile-label">{p.displayName}</span>
          </div>
        ))}
        {overflow > 0 && (
          <div className="cvp-tile cvp-tile-overflow">
            <span className="cvp-overflow-count">+{overflow}</span>
            <span className="cvp-tile-label">more</span>
          </div>
        )}
      </div>

      {/* Overlay call info bar */}
      <div className="cvp-topbar">
        <span className="cvp-title">{callTitle}</span>
        {isLive && (
          <span className="cvp-live-badge">
            <span className="cvp-live-dot" />
            Live
          </span>
        )}
      </div>

      {/* Control bar mock */}
      <div className="cvp-controls">
        <div className="cvp-ctrl-btn cvp-ctrl-mic">🎤</div>
        <div className="cvp-ctrl-btn cvp-ctrl-cam">📷</div>
        <Link
          className="cvp-join-btn"
          href={`/calls/${callId}/live` as Route}
        >
          {isLive ? "Rejoin call" : "Join live call"} →
        </Link>
        <div className="cvp-ctrl-btn cvp-ctrl-leave">✕</div>
      </div>
    </div>
  );
}
