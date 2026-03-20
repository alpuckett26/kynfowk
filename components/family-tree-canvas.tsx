"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useReactFlow,
  type Edge,
  type FitViewOptions,
  type Node,
  type NodeProps,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { addPlaceholderMemberAction, scheduleDirectCallAction } from "@/app/actions";
import { RELATIONSHIP_OPTIONS, type TreeLayout, type TreeMember } from "@/lib/relationship-classifier";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// ---------------------------------------------------------------------------
// Presence helpers
// ---------------------------------------------------------------------------

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000;

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

const AVATAR_COLORS = ["#c7663f", "#7c6af7", "#0ea5e9", "#d97706", "#16a34a", "#db2777"];

function avatarColor(name: string) {
  const i = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function MemberAvatar({
  member,
  size = 44,
}: {
  member: Pick<TreeMember, "display_name" | "avatar_url" | "is_placeholder" | "is_deceased">;
  size?: number;
}) {
  const initials = member.display_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const bg =
    member.is_placeholder || member.is_deceased ? "#b0a898" : avatarColor(member.display_name);

  return member.avatar_url ? (
    <div className="tree-avatar" style={{ width: size, height: size }}>
      <Image
        alt={member.display_name}
        height={size}
        src={member.avatar_url}
        style={{ borderRadius: "50%", objectFit: "cover", display: "block" }}
        unoptimized
        width={size}
      />
    </div>
  ) : (
    <div
      className="tree-avatar tree-avatar-initials"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.32 }}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Online indicator dot
// ---------------------------------------------------------------------------

function OnlineDot({ online, size = 10 }: { online: boolean; size?: number }) {
  if (!online) return null;
  return <span className="tree-online-dot" style={{ width: size, height: size }} aria-label="Online" />;
}

// ---------------------------------------------------------------------------
// Member info panel (modal sheet)
// ---------------------------------------------------------------------------

function MemberInfoPanel({
  member,
  familyCircleId,
  viewerMembershipId,
  onClose,
}: {
  member: TreeMember;
  familyCircleId: string;
  viewerMembershipId: string;
  onClose: () => void;
}) {
  const online = isOnline(member.last_seen_at);
  const formRef = useRef<HTMLFormElement>(null);
  const [scheduling, setScheduling] = useState(false);

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const defaultStart = (() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  })();

  return (
    <div className="member-panel-backdrop" onClick={handleBackdrop}>
      <div className="member-panel" role="dialog" aria-modal>
        <div className="member-panel-header">
          <div className="member-panel-avatar-wrap">
            <MemberAvatar member={member} size={72} />
            {online && <OnlineDot online size={14} />}
          </div>
          <div className="member-panel-identity">
            <h2 className="member-panel-name">{member.display_name}</h2>
            {member.relationship_label && (
              <p className="member-panel-rel">{member.relationship_label}</p>
            )}
            <p className={`member-panel-status ${online ? "member-panel-status-online" : "member-panel-status-offline"}`}>
              {online ? "Online now" : member.last_seen_at ? "Away" : "Offline"}
            </p>
          </div>
          <button className="member-panel-close" onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>

        {(member.invite_email || member.phone_number) && (
          <div className="member-panel-section">
            <p className="member-panel-section-label">Contact</p>
            {member.invite_email && (
              <a className="member-panel-contact-row" href={`mailto:${member.invite_email}`}>
                <span className="member-panel-contact-icon">✉</span>
                {member.invite_email}
              </a>
            )}
            {member.phone_number && (
              <a className="member-panel-contact-row" href={`tel:${member.phone_number}`}>
                <span className="member-panel-contact-icon">☎</span>
                {member.phone_number}
              </a>
            )}
          </div>
        )}

        {member.is_placeholder && member.placeholder_notes && (
          <div className="member-panel-section">
            <p className="member-panel-section-label">Note</p>
            <p className="meta">{member.placeholder_notes}</p>
          </div>
        )}

        {!member.is_placeholder && !member.isViewer && (
          <div className="member-panel-section">
            <p className="member-panel-section-label">Schedule a call</p>
            {!scheduling ? (
              <button
                className="button"
                onClick={() => setScheduling(true)}
                type="button"
              >
                📅 Schedule call with {member.display_name.split(" ")[0]}
              </button>
            ) : (
              <form
                ref={formRef}
                action={scheduleDirectCallAction}
                className="member-schedule-form stack-sm"
              >
                <input name="familyCircleId" type="hidden" value={familyCircleId} />
                <input name="targetMembershipId" type="hidden" value={member.id} />

                <label className="field">
                  <span>Call title</span>
                  <input
                    defaultValue={`Call with ${member.display_name.split(" ")[0]}`}
                    name="title"
                    required
                  />
                </label>

                <label className="field">
                  <span>Date &amp; time</span>
                  <input
                    defaultValue={defaultStart}
                    min={new Date().toISOString().slice(0, 16)}
                    name="scheduledStart"
                    required
                    type="datetime-local"
                  />
                </label>

                <label className="field">
                  <span>Duration</span>
                  <select defaultValue="30" name="durationMinutes">
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </label>

                <div className="call-actions">
                  <button className="button" type="submit">Schedule call</button>
                  <button
                    className="button button-ghost"
                    onClick={() => setScheduling(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add placeholder form
// ---------------------------------------------------------------------------

function AddPlaceholderPanel({ onClose }: { onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [isDeceased, setIsDeceased] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setPending(true);
      const fd = new FormData(e.currentTarget);
      fd.set("isDeceased", isDeceased ? "true" : "false");
      await addPlaceholderMemberAction(fd);
      formRef.current?.reset();
      setPending(false);
      onClose();
    },
    [isDeceased, onClose]
  );

  return (
    <div className="tree-placeholder-panel">
      <div className="tree-placeholder-panel-header">
        <h3>Add a placeholder</h3>
        <button className="tree-panel-close" onClick={onClose} type="button">✕</button>
      </div>
      <p className="meta">
        Holds a spot for someone who hasn&apos;t joined yet or is no longer with us.
        When someone joins with a matching email, they&apos;ll claim their place automatically.
      </p>
      <form className="tree-placeholder-form stack-md" onSubmit={handleSubmit} ref={formRef}>
        <div className="field-grid two-col">
          <label className="field">
            <span>Name</span>
            <input name="displayName" placeholder="Grandma June" required />
          </label>
          <label className="field">
            <span>Relationship to you</span>
            <select name="relationship" required>
              <option value="">— Select —</option>
              {RELATIONSHIP_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Email (optional — used to auto-claim when they join)</span>
          <input name="inviteEmail" placeholder="june@example.com" type="email" />
        </label>
        <label className="field">
          <span>Context note (optional)</span>
          <input name="placeholderNotes" placeholder="e.g. Jennifer&apos;s brother Matt" />
        </label>
        <label className="tree-deceased-toggle">
          <input
            checked={isDeceased}
            onChange={(e) => setIsDeceased(e.target.checked)}
            type="checkbox"
          />
          <span>In memoriam — this person is deceased</span>
        </label>
        <div className="call-actions">
          <button className="button" disabled={pending} type="submit">
            {pending ? "Adding…" : "Add to tree"}
          </button>
          <button className="button button-ghost" onClick={onClose} type="button">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Branch health state — derived from last completed call participation
// ---------------------------------------------------------------------------

type HealthState = "thriving" | "healthy" | "quiet" | "drifting" | "dry";

const HEALTH: Record<HealthState, { colour: string; rank: number; label: string }> = {
  thriving: { colour: "#2D6A4F", rank: 0, label: "Thriving" },
  healthy:  { colour: "#74C69D", rank: 1, label: "Healthy" },
  quiet:    { colour: "#F59E0B", rank: 2, label: "Quiet" },
  drifting: { colour: "#9CA3AF", rank: 3, label: "Drifting" },
  dry:      { colour: "#E5E7EB", rank: 4, label: "Dry" },
};

function getHealthState(lastContactAt: string | null | undefined): HealthState {
  if (!lastContactAt) return "dry";
  const days = (Date.now() - new Date(lastContactAt).getTime()) / 86_400_000;
  if (days < 7)  return "thriving";
  if (days < 14) return "healthy";
  if (days < 30) return "quiet";
  if (days < 60) return "drifting";
  return "dry";
}

// The weakest (highest-rank) health drives the circle ring and inter-circle edges.
function weakestHealth(states: HealthState[]): HealthState {
  if (!states.length) return "dry";
  return states.reduce(
    (worst, s) => (HEALTH[s].rank > HEALTH[worst].rank ? s : worst),
    states[0]
  );
}

function formatContact(lastContactAt: string | null): string {
  if (!lastContactAt) return "No calls yet";
  const days = Math.floor((Date.now() - new Date(lastContactAt).getTime()) / 86_400_000);
  if (days === 0) return "Called today";
  if (days === 1) return "Called yesterday";
  if (days < 7)  return `Called ${days}d ago`;
  if (days < 14) return "Called last week";
  if (days < 30) return `Called ${Math.floor(days / 7)}w ago`;
  if (days < 60) return "Called last month";
  return `Called ${Math.floor(days / 30)}mo ago`;
}

type ZoomLevel = "tree" | "circle";

// ---------------------------------------------------------------------------
// SVG arc gauge helpers
// ---------------------------------------------------------------------------

const GAUGE_CX = 60;
const GAUGE_CY = 60;
const GAUGE_R  = 50;   // arc radius
const GAUGE_SW = 7;    // stroke width
// 270° arc: starts lower-left (135°), sweeps clockwise to lower-right (45°)
const GAUGE_START_DEG = 135;
const GAUGE_TOTAL_DEG = 270;

function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, sweepDeg: number): string {
  if (sweepDeg <= 0) return "";
  // Clamp so we never try to draw a 360° arc (SVG collapses it to nothing)
  const clampedSweep = Math.min(sweepDeg, 359.99);
  const s = polarXY(cx, cy, r, startDeg);
  const e = polarXY(cx, cy, r, startDeg + clampedSweep);
  const large = clampedSweep > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)},${s.y.toFixed(2)} A ${r},${r} 0 ${large},1 ${e.x.toFixed(2)},${e.y.toFixed(2)}`;
}

function scoreToColour(score: number): string {
  if (score >= 80) return HEALTH.thriving.colour;
  if (score >= 60) return HEALTH.healthy.colour;
  if (score >= 40) return HEALTH.quiet.colour;
  if (score >= 20) return HEALTH.drifting.colour;
  return HEALTH.dry.colour;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

// ---------------------------------------------------------------------------
// React Flow node types
// ---------------------------------------------------------------------------

type CircleNodeData = { name: string; memberCount: number; healthState: HealthState; strengthScore: number };
type MemberNodeData = {
  member: TreeMember;
  online: boolean;
  healthState: HealthState;
  showDetail: boolean;
  lastContactAt: string | null;
};

type CircleFlowNode = Node<CircleNodeData, "circleNode">;
type MemberFlowNode = Node<MemberNodeData, "memberNode">;
type FlowNode = CircleFlowNode | MemberFlowNode;

function CircleNodeComp({ data }: NodeProps<CircleFlowNode>) {
  const score = data.strengthScore;
  const scoreColour = scoreToColour(score);
  const trackPath = arcPath(GAUGE_CX, GAUGE_CY, GAUGE_R, GAUGE_START_DEG, GAUGE_TOTAL_DEG);
  const scoreSweep = (score / 100) * GAUGE_TOTAL_DEG;
  const scorePath = scoreSweep > 0 ? arcPath(GAUGE_CX, GAUGE_CY, GAUGE_R, GAUGE_START_DEG, scoreSweep) : null;
  const innerR = GAUGE_R - GAUGE_SW - 4;

  return (
    <div className="flow-circle-node">
      <svg viewBox="0 0 120 120" width={120} height={120} style={{ display: "block" }}>
        {/* Background track */}
        <path d={trackPath} fill="none" stroke="#E5E7EB" strokeWidth={GAUGE_SW} strokeLinecap="round" />
        {/* Score arc */}
        {scorePath && (
          <path d={scorePath} fill="none" stroke={scoreColour} strokeWidth={GAUGE_SW} strokeLinecap="round" />
        )}
        {/* Inner filled circle */}
        <circle cx={GAUGE_CX} cy={GAUGE_CY} r={innerR} fill="#7c6af7" />
        {/* Score number */}
        <text
          x={GAUGE_CX}
          y={GAUGE_CY - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={22}
          fontWeight={700}
          fill="#fff"
        >
          {score}
        </text>
        {/* "pts" label */}
        <text
          x={GAUGE_CX}
          y={GAUGE_CY + 14}
          textAnchor="middle"
          fontSize={10}
          fill="rgba(255,255,255,0.7)"
        >
          pts
        </text>
      </svg>
      <div className="flow-circle-node-name">{truncate(data.name, 18)}</div>
      <div className="flow-circle-node-meta">
        {data.memberCount} member{data.memberCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

function MemberNodeComp({ data }: NodeProps<MemberFlowNode>) {
  const { member, online, healthState, showDetail, lastContactAt } = data;
  const { colour } = HEALTH[healthState];
  const isDry = healthState === "dry";

  const stateClass = member.isViewer
    ? "tree-member-viewer"
    : member.is_placeholder
      ? "tree-member-placeholder"
      : member.is_deceased
        ? "tree-member-deceased"
        : "";

  const tag = member.is_placeholder
    ? "Placeholder"
    : member.is_deceased
      ? "In memoriam"
      : member.status === "invited"
        ? "Invited"
        : null;

  return (
    <div
      className={`flow-member-node ${stateClass}${showDetail ? " flow-member-node--expanded" : ""}`}
      style={{
        borderLeftColor: colour,
        borderLeftStyle: isDry ? "dashed" : "solid",
      }}
    >
      <div className="tree-member-avatar-wrap">
        <MemberAvatar member={member} size={showDetail ? 44 : 36} />
        {online && <OnlineDot online size={8} />}
      </div>
      <div className="tree-member-info">
        <span className="tree-member-name">{member.display_name}</span>
        {!member.isViewer && (
          <span className="tree-member-rel">
            {member.classification.normalized || member.relationship_label || ""}
          </span>
        )}
        {tag && <span className="tree-member-status-tag">{tag}</span>}
        {showDetail && (
          <div className="flow-member-node-detail">
            <span className="flow-member-health-label" style={{ color: colour }}>
              {HEALTH[healthState].label}
            </span>
            <span className="flow-member-contact">{formatContact(lastContactAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const NODE_TYPES = {
  circleNode: CircleNodeComp,
  memberNode: MemberNodeComp,
};

// ---------------------------------------------------------------------------
// Layout builder: TreeLayout → React Flow nodes
// ---------------------------------------------------------------------------

const ROW_HEIGHT = 150;
const NODE_WIDTH = 195;
const CIRCLE_NODE_W = 120;

function buildFlowNodes(
  circleName: string,
  layout: TreeLayout,
  presenceMap: Record<string, string | null>,
  healthMap: Record<string, string | null>,
  strengthScore: number
): FlowNode[] {
  const nodes: FlowNode[] = [];

  const totalMembers = layout.rows.reduce((s, r) => s + r.members.length, 0);
  const maxGen = layout.rows.length > 0
    ? Math.max(...layout.rows.map((r) => r.generation))
    : 0;

  // Circle health = weakest member health (makes every dry branch visible at full-tree zoom)
  const allMemberIds = layout.rows.flatMap((r) => r.members.map((m) => m.id));
  const circleHealth = weakestHealth(
    allMemberIds.map((id) => getHealthState(healthMap[id]))
  );

  // Circle header node sits above all member rows
  nodes.push({
    id: "__circle__",
    type: "circleNode",
    position: { x: -(CIRCLE_NODE_W / 2), y: 0 },
    data: { name: circleName, memberCount: totalMembers, healthState: circleHealth, strengthScore },
    selectable: false,
    draggable: false,
  } as CircleFlowNode);

  for (const row of layout.rows) {
    // Higher generations sit closer to the circle header
    const y = (maxGen - row.generation) * ROW_HEIGHT + 120;

    row.members.forEach((member, i) => {
      // Spread members evenly centred on x=0
      const x = (i - (row.members.length - 1) / 2) * NODE_WIDTH - NODE_WIDTH / 2;
      nodes.push({
        id: member.id,
        type: "memberNode",
        position: { x, y },
        data: {
          member,
          online: !member.isViewer && isOnline(presenceMap[member.id] ?? null),
          healthState: getHealthState(healthMap[member.id]),
          showDetail: false,
          lastContactAt: healthMap[member.id] ?? null,
        },
      } as MemberFlowNode);
    });
  }

  return nodes;
}

// ---------------------------------------------------------------------------
// Inner flow component — uses useReactFlow (must be inside ReactFlowProvider)
// ---------------------------------------------------------------------------

type FitViewFn = (opts?: FitViewOptions<FlowNode>) => Promise<boolean>;

function FamilyFlowInner({
  nodes,
  edges,
  onNodesChange,
  onNodeClick,
  onPaneClick,
  zoomLevel,
  onBack,
  fitViewRef,
}: {
  nodes: FlowNode[];
  edges: Edge[];
  onNodesChange: ReturnType<typeof useNodesState<FlowNode>>[2];
  onNodeClick: NodeMouseHandler;
  onPaneClick: () => void;
  zoomLevel: ZoomLevel;
  onBack: () => void;
  fitViewRef: React.MutableRefObject<FitViewFn | null>;
}) {
  const { fitView } = useReactFlow<FlowNode>();

  // Expose fitView to parent so it can trigger viewport transitions
  useEffect(() => {
    fitViewRef.current = fitView;
  }, [fitView, fitViewRef]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.12}
      maxZoom={2.5}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      colorMode="light"
    >
      {/* Back button — visible only at circle zoom level */}
      {zoomLevel === "circle" && (
        <Panel position="top-left">
          <button className="flow-back-button" onClick={onBack} type="button">
            ← Full tree
          </button>
        </Panel>
      )}

      <Background gap={24} color="#e5ddd0" />
      <Controls />
      <MiniMap
        nodeColor={(node) => {
          if (node.type === "circleNode") {
            const d = node.data as CircleNodeData;
            return HEALTH[d.healthState ?? "dry"].colour;
          }
          const d = node.data as MemberNodeData;
          if (!d?.member) return HEALTH.dry.colour;
          if (d.member.isViewer) return "#c7663f";
          return HEALTH[d.healthState ?? "dry"].colour;
        }}
        maskColor="rgba(248,244,236,0.75)"
      />
    </ReactFlow>
  );
}

// ---------------------------------------------------------------------------
// Main canvas
// ---------------------------------------------------------------------------

export function FamilyTreeCanvas({
  layout,
  familyCircleId,
  viewerMembershipId,
  circleName,
  healthMap,
  strengthScore,
}: {
  layout: TreeLayout;
  familyCircleId: string;
  viewerMembershipId: string;
  circleName: string;
  healthMap: Record<string, string | null>;
  strengthScore: number;
}) {
  const [selectedMember, setSelectedMember] = useState<TreeMember | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>("tree");
  const fitViewRef = useRef<FitViewFn | null>(null);

  const [presenceMap, setPresenceMap] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const row of layout.rows) {
      for (const m of row.members) map[m.id] = m.last_seen_at;
    }
    return map;
  });

  // Live presence via Supabase Realtime
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel("family-presence")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "family_memberships",
          filter: `family_circle_id=eq.${familyCircleId}`,
        },
        (payload) => {
          const { id, last_seen_at } = payload.new as { id: string; last_seen_at: string | null };
          setPresenceMap((prev) => ({ ...prev, [id]: last_seen_at }));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [familyCircleId]);

  // Build nodes from layout (rebuilt only when layout/circleName/healthMap change)
  const initialNodes = useMemo(
    () => buildFlowNodes(circleName, layout, presenceMap, healthMap, strengthScore),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [circleName, layout, healthMap]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes);

  // Sync online status into node data when presenceMap updates
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type !== "memberNode") return n;
        const d = n.data as MemberNodeData;
        const online = !d.member.isViewer && isOnline(presenceMap[d.member.id] ?? null);
        if (d.online === online) return n;
        return { ...n, data: { ...n.data, online } };
      })
    );
  }, [presenceMap, setNodes]);

  // ── Zoom transitions ────────────────────────────────────────────────────

  function zoomToCircle() {
    // Capture member IDs before any state mutation
    const memberNodeIds = layout.rows
      .flatMap((r) => r.members.map((m) => ({ id: m.id })));

    setZoomLevel("circle");
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type !== "memberNode") return n;
        return { ...n, data: { ...n.data, showDetail: true } };
      })
    );

    // Wait one frame for node heights to settle before fitView
    setTimeout(() => {
      fitViewRef.current?.({ nodes: memberNodeIds, padding: 0.3, duration: 500 });
    }, 60);
  }

  function zoomToTree() {
    setZoomLevel("tree");
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type !== "memberNode") return n;
        return { ...n, data: { ...n.data, showDetail: false } };
      })
    );

    setTimeout(() => {
      fitViewRef.current?.({ duration: 500 });
    }, 60);
  }

  // ── Event handlers ──────────────────────────────────────────────────────

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "circleNode") {
        zoomToCircle();
      } else if (node.type === "memberNode") {
        setSelectedMember((node.data as MemberNodeData).member);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout]
  );

  const onPaneClick = useCallback(() => {
    if (zoomLevel === "circle") zoomToTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomLevel]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (layout.rows.length === 0) {
    return (
      <div className="tree-empty">
        <p>No family members placed yet. Add members with relationship labels on the Family page, or add a placeholder below.</p>
        <button className="button button-secondary" onClick={() => setShowAddPanel(true)} type="button">
          + Add placeholder
        </button>
        {showAddPanel && <AddPlaceholderPanel onClose={() => setShowAddPanel(false)} />}
      </div>
    );
  }

  return (
    <>
      <div className="family-flow-wrap">
        {/* Legend — health states */}
        <div className="tree-legend">
          {(Object.entries(HEALTH) as [HealthState, typeof HEALTH[HealthState]][]).map(
            ([state, { colour, label }]) => (
              <span
                key={state}
                className="tree-legend-item"
                style={{ "--legend-colour": colour } as React.CSSProperties}
              >
                {label}
              </span>
            )
          )}
          <span className="tree-legend-item tree-legend-online">Online</span>
        </div>

        {/* React Flow canvas — ReactFlowProvider enables useReactFlow in FamilyFlowInner */}
        <div className="family-flow-canvas">
          <ReactFlowProvider>
            <FamilyFlowInner
              nodes={nodes}
              edges={[]}
              onNodesChange={onNodesChange}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              zoomLevel={zoomLevel}
              onBack={zoomToTree}
              fitViewRef={fitViewRef}
            />
          </ReactFlowProvider>
        </div>

        {/* Add placeholder */}
        <div className="tree-add-row">
          {showAddPanel ? (
            <AddPlaceholderPanel onClose={() => setShowAddPanel(false)} />
          ) : (
            <button className="tree-add-placeholder-btn" onClick={() => setShowAddPanel(true)} type="button">
              <span className="tree-add-icon">+</span>
              Add a family member placeholder
            </button>
          )}
        </div>
      </div>

      {selectedMember && (
        <MemberInfoPanel
          member={selectedMember}
          familyCircleId={familyCircleId}
          viewerMembershipId={viewerMembershipId}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}
