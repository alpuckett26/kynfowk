"use client";

import type { MutableRefObject } from "react";
import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Wind {
  value:  number;   // -1..1 current strength
  target: number;   // easing toward this
  timer:  number;   // ms until next target change
}

interface Leaf {
  x: number; y: number;
  vx: number; vy: number;
  swingAngle: number;  // pendulum offset
  swingV:     number;  // pendulum angular velocity
  rot:        number;  // visual rotation (follows swing)
  size:       number;
  color:      string;
  opacity:    number;
  phase:      number;  // turbulence phase offset
}

interface Bird {
  x: number; y: number;
  vx: number;
  baseY:     number;   // equilibrium altitude
  wing:      number;   // flap phase
  wingSpeed: number;
  size:      number;
}

interface Squirrel {
  x: number; y: number;
  tx:         number;
  speed:      number;
  dir:        1 | -1;
  legPhase:   number;
  tailPhase:  number;
  state:      "run" | "idle" | "nibble";
  idleLeft:   number;
  nibblePhase: number;
}

interface Apple {
  x: number; y: number;
  vy:     number;
  rot:    number;
  rotV:   number;
  active: boolean;
}

interface Cloud {
  x: number; y: number;
  speed: number;
  scale: number;
}

interface Scene {
  wind:     Wind;
  leaves:   Leaf[];
  birds:    Bird[];
  squirrel: Squirrel;
  apples:   Apple[];
  clouds:   Cloud[];
  nextLeaf:  number;
  nextApple: number;
}

// ---------------------------------------------------------------------------
// World-space constants
// ---------------------------------------------------------------------------

const TRUNK_BASE_Y = 820;
const TRUNK_TOP_Y  = 60;
const TRUNK_W      = 100;
const BRANCH_Y     = 320;
const CANOPY_CX    = 0;
const CANOPY_CY    = 100;
const CANOPY_R     = 580;

const LEAF_COLORS = [
  "#2D8A3E", "#3DAA50", "#52B788",
  "#F59E0B", "#FBBF24", "#E86A1A", "#EF4444", "#C8820A",
];

// [relX, relY, radiusFraction, windPhaseOffset]
const CLUSTERS: [number, number, number, number][] = [
  [0,                0,                1.00, 0.0],
  [-CANOPY_R * 0.44, CANOPY_R * 0.12, 0.70, 0.9],
  [ CANOPY_R * 0.44, CANOPY_R * 0.12, 0.70, 1.8],
  [-CANOPY_R * 0.20,-CANOPY_R * 0.30, 0.64, 0.4],
  [ CANOPY_R * 0.20,-CANOPY_R * 0.26, 0.64, 1.3],
  [-CANOPY_R * 0.54,-CANOPY_R * 0.08, 0.50, 2.2],
  [ CANOPY_R * 0.54,-CANOPY_R * 0.08, 0.50, 3.0],
];

// ---------------------------------------------------------------------------
// Sky + sun
// ---------------------------------------------------------------------------

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0,    "#1A6FA8");
  g.addColorStop(0.45, "#87CEEB");
  g.addColorStop(1,    "#FFD8A8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const sx = w * 0.82, sy = h * 0.10;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.19);
  glow.addColorStop(0,   "rgba(255,245,130,0.55)");
  glow.addColorStop(0.4, "rgba(255,220,80,0.18)");
  glow.addColorStop(1,   "rgba(255,220,80,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(sx, sy, h * 0.19, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#FFD700";
  ctx.beginPath(); ctx.arc(sx, sy, h * 0.046, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFF8C0";
  ctx.beginPath(); ctx.arc(sx - 3, sy - 4, h * 0.029, 0, Math.PI * 2); ctx.fill();
}

// ---------------------------------------------------------------------------
// Clouds (screen-space)
// ---------------------------------------------------------------------------

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.shadowColor = "rgba(100,160,210,0.22)";
  ctx.shadowBlur = 10 * s;
  const p = (dx: number, dy: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    ctx.fill();
  };
  p(0, 0, 22); p(-23, 9, 17); p(23, 9, 17);
  p(-39, 17, 13); p(39, 17, 13);
  p(-10, -13, 17); p(13, -11, 14);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Ground — animated grass blades driven by wind
// ---------------------------------------------------------------------------

function drawGround(ctx: CanvasRenderingContext2D, t: number, wind: number) {
  const g = ctx.createLinearGradient(0, TRUNK_BASE_Y, 0, TRUNK_BASE_Y + 600);
  g.addColorStop(0,   "#4A7C3F");
  g.addColorStop(0.2, "#3D6B34");
  g.addColorStop(1,   "#2A4A22");
  ctx.fillStyle = g;
  ctx.fillRect(-80000, TRUNK_BASE_Y, 160000, 2000);

  ctx.lineCap = "round";
  for (let i = -1400; i < 1400; i += 7) {
    const ht   = 5 + Math.sin(i * 0.73) * 3.2;
    const sway = Math.sin(t * 0.0012 + i * 0.047) * (1.5 + wind * 5);
    ctx.strokeStyle = (i % 3 === 0) ? "#6BBF5A" : (i % 3 === 1) ? "#5EA34F" : "#52923E";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(i, TRUNK_BASE_Y);
    ctx.quadraticCurveTo(i + sway * 0.6, TRUNK_BASE_Y - ht * 0.55, i + sway, TRUNK_BASE_Y - ht);
    ctx.stroke();
  }

  const flowers: [number, string, string][] = [
    [-860, "#FF69B4", "#FFD700"], [-610, "#FFD700", "#FFA500"],
    [-370, "#FF9999", "#FFD700"], [ 180, "#FFD700", "#FFA500"],
    [ 430, "#FF69B4", "#FFD700"], [ 680, "#FFFFFF", "#FFDD00"],
    [ 910, "#FFD700", "#FFA500"],
  ];
  flowers.forEach(([fx, petalCol, centerCol]) => {
    const sw = Math.sin(t * 0.001 + fx * 0.03) * (1 + wind * 3);
    ctx.save();
    ctx.translate(fx + sw * 0.4, TRUNK_BASE_Y + 4);
    ctx.fillStyle = petalCol;
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 5.5, Math.sin(a) * 3.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = centerCol;
    ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
}

// ---------------------------------------------------------------------------
// Trunk + branches
// ---------------------------------------------------------------------------

function drawTrunk(ctx: CanvasRenderingContext2D, t: number, wind: number) {
  const sw = Math.sin(t * 0.00038) * (4 + wind * 8);

  ctx.fillStyle = "rgba(0,0,0,0.09)";
  ctx.beginPath();
  ctx.moveTo(-TRUNK_W * 0.46 + 12, TRUNK_BASE_Y);
  ctx.bezierCurveTo(-TRUNK_W * 0.26 + 12, TRUNK_BASE_Y - 280,
                    -TRUNK_W * 0.18 + 12, TRUNK_BASE_Y - 580,
                    -TRUNK_W * 0.16 + sw + 12, TRUNK_TOP_Y);
  ctx.lineTo(TRUNK_W * 0.16 + sw + 12, TRUNK_TOP_Y);
  ctx.bezierCurveTo(TRUNK_W * 0.18 + 12, TRUNK_BASE_Y - 580,
                    TRUNK_W * 0.26 + 12, TRUNK_BASE_Y - 280,
                    TRUNK_W * 0.46 + 12, TRUNK_BASE_Y);
  ctx.closePath(); ctx.fill();

  const tg = ctx.createLinearGradient(-TRUNK_W * 0.5, 0, TRUNK_W * 0.5, 0);
  tg.addColorStop(0,    "#4A2800");
  tg.addColorStop(0.22, "#8B5E3C");
  tg.addColorStop(0.62, "#7C4A20");
  tg.addColorStop(1,    "#4A2800");
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(-TRUNK_W * 0.46, TRUNK_BASE_Y);
  ctx.bezierCurveTo(-TRUNK_W * 0.26, TRUNK_BASE_Y - 280,
                    -TRUNK_W * 0.18, TRUNK_BASE_Y - 580,
                    -TRUNK_W * 0.16 + sw, TRUNK_TOP_Y);
  ctx.lineTo(TRUNK_W * 0.16 + sw, TRUNK_TOP_Y);
  ctx.bezierCurveTo(TRUNK_W * 0.18, TRUNK_BASE_Y - 580,
                    TRUNK_W * 0.26, TRUNK_BASE_Y - 280,
                    TRUNK_W * 0.46, TRUNK_BASE_Y);
  ctx.closePath(); ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.08)"; ctx.lineWidth = 2.5; ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const lx = -TRUNK_W * 0.32 + i * TRUNK_W * 0.16;
    ctx.beginPath();
    ctx.moveTo(lx, TRUNK_BASE_Y - 20);
    ctx.quadraticCurveTo(lx + (i % 2 ? 7 : -7), TRUNK_BASE_Y - 400, lx + sw * 0.4, TRUNK_TOP_Y + 60);
    ctx.stroke();
  }

  const bsw = sw * 0.6;
  ctx.strokeStyle = "#7C4A20"; ctx.lineCap = "round";
  ctx.lineWidth = TRUNK_W * 0.27;
  ctx.beginPath();
  ctx.moveTo(-TRUNK_W * 0.12 + bsw * 0.4, BRANCH_Y);
  ctx.quadraticCurveTo(-TRUNK_W * 2.2 + bsw, BRANCH_Y - 70, -TRUNK_W * 4.2 + bsw * 1.6, BRANCH_Y + 20);
  ctx.stroke();
  ctx.lineWidth = TRUNK_W * 0.22;
  ctx.beginPath();
  ctx.moveTo(TRUNK_W * 0.12 + bsw * 0.4, BRANCH_Y - 35);
  ctx.quadraticCurveTo(TRUNK_W * 2 + bsw, BRANCH_Y - 130, TRUNK_W * 3.8 + bsw * 1.6, BRANCH_Y - 55);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Canopy — each cluster has its own wind phase for ripple effect
// ---------------------------------------------------------------------------

function drawCanopy(ctx: CanvasRenderingContext2D, t: number, wind: number) {
  const amp = 9 + Math.abs(wind) * 16;
  const sway = (ph: number) => Math.sin(t * 0.00038 + ph) * amp;

  // Shadow
  ctx.fillStyle = "rgba(0,30,0,0.20)";
  CLUSTERS.forEach(([dx, dy, rf, ph]) => {
    const sw = sway(ph);
    ctx.beginPath();
    ctx.arc(CANOPY_CX + dx + sw + 14, CANOPY_CY + dy + 14, CANOPY_R * rf, 0, Math.PI * 2);
    ctx.fill();
  });

  // Color layers — each smaller, higher, lighter
  const layers: [string, number, number, number][] = [
    ["#1A5C1E", 1.00,  0,   0],
    ["#2E7D32", 0.86, -3,  -6],
    ["#388E3C", 0.70, -5, -13],
    ["#43A047", 0.55, -7, -21],
    ["#66BB6A", 0.38, -9, -30],
  ];

  layers.forEach(([color, sc, ox, oy]) => {
    ctx.fillStyle = color;
    CLUSTERS.forEach(([dx, dy, rf, ph]) => {
      const sw = sway(ph) * sc;
      ctx.beginPath();
      ctx.arc(
        CANOPY_CX + dx * sc + sw + ox,
        CANOPY_CY + dy * sc + oy,
        CANOPY_R * rf * sc, 0, Math.PI * 2
      );
      ctx.fill();
    });
  });
}

// ---------------------------------------------------------------------------
// Leaf — pointed teardrop with midrib, pendulum flutter
// ---------------------------------------------------------------------------

function drawLeaf(ctx: CanvasRenderingContext2D, l: Leaf) {
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.rot);
  ctx.globalAlpha = l.opacity;
  const s = l.size;
  ctx.fillStyle = l.color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.bezierCurveTo( s * 0.55, -s * 0.38,  s * 0.50, s * 0.27, 0,  s * 0.30);
  ctx.bezierCurveTo(-s * 0.50,  s * 0.27, -s * 0.55, -s * 0.38, 0, -s);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.88);
  ctx.quadraticCurveTo(s * 0.07, 0, 0, s * 0.26);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Bird — filled body + wing silhouette, smooth altitude arcing
// ---------------------------------------------------------------------------

function drawBird(ctx: CanvasRenderingContext2D, b: Bird) {
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.vx < 0) ctx.scale(-1, 1);

  const s = b.size;
  const wAng = Math.sin(b.wing) * 0.62;
  ctx.fillStyle = "#18182C";

  // Left wing
  ctx.beginPath();
  ctx.moveTo(s * 0.05, 0);
  ctx.bezierCurveTo(-s * 0.35, -s * wAng * 0.9, -s * 0.85, -s * wAng, -s * 1.38, -s * wAng * 0.22 + s * 0.18);
  ctx.bezierCurveTo(-s * 0.78, -s * wAng * 0.12, -s * 0.26, s * 0.06, s * 0.05, 0);
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(-s * 0.05, 0);
  ctx.bezierCurveTo( s * 0.35, -s * wAng * 0.9,  s * 0.85, -s * wAng,  s * 1.38, -s * wAng * 0.22 + s * 0.18);
  ctx.bezierCurveTo( s * 0.78, -s * wAng * 0.12,  s * 0.26, s * 0.06, -s * 0.05, 0);
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.ellipse(s * 0.12, 0, s * 0.50, s * 0.16, -0.12, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(s * 0.54, -s * 0.09, s * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Tail fan
  ctx.beginPath();
  ctx.moveTo(-s * 0.44, s * 0.04);
  ctx.lineTo(-s * 0.80, s * 0.22);
  ctx.lineTo(-s * 0.72, -s * 0.04);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Squirrel — animated wavy tail, nibble idle, proper leg alternation
// ---------------------------------------------------------------------------

function drawSquirrel(ctx: CanvasRenderingContext2D, sq: Squirrel) {
  ctx.save();
  ctx.translate(sq.x, sq.y);
  if (sq.dir < 0) ctx.scale(-1, 1);

  const bob  = sq.state === "run" ? Math.sin(sq.legPhase * 2) * 2.5 : 0;
  const nib  = sq.state === "nibble" ? Math.sin(sq.nibblePhase * 8) * 1.8 : 0;
  const yOff = bob + nib;
  const tw   = Math.sin(sq.tailPhase) * 11;
  const tw2  = Math.sin(sq.tailPhase + 1.4) * 7;

  // Tail — outer fur (thick)
  ctx.strokeStyle = "#92400E"; ctx.lineWidth = 13; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-3, -9 + yOff);
  ctx.bezierCurveTo(-9 + tw * 0.25, -22 + yOff, -20 + tw, -37 + yOff + tw2 * 0.4, -15 + tw * 1.1, -53 + yOff);
  ctx.stroke();

  // Tail — inner lighter stripe
  ctx.strokeStyle = "#D97706"; ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-3, -9 + yOff);
  ctx.bezierCurveTo(-9 + tw * 0.25, -22 + yOff, -20 + tw, -37 + yOff + tw2 * 0.4, -15 + tw * 1.1, -53 + yOff);
  ctx.stroke();

  // Tail tip highlight
  ctx.strokeStyle = "#FDE68A"; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-17 + tw, -45 + yOff);
  ctx.lineTo(-15 + tw * 1.1, -53 + yOff);
  ctx.stroke();

  // Body
  ctx.fillStyle = "#92400E";
  ctx.beginPath();
  ctx.ellipse(0, -11 + yOff, 9, 13, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(7, -27 + yOff, 8.5, 0, Math.PI * 2);
  ctx.fill();

  // Cheek puff when nibbling
  if (sq.state === "nibble") {
    ctx.fillStyle = "#A0522D";
    ctx.beginPath();
    ctx.ellipse(11, -24 + yOff, 5.5, 4.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ear
  ctx.fillStyle = "#7C3400";
  ctx.beginPath();
  ctx.moveTo(7, -33 + yOff); ctx.lineTo(13, -43 + yOff); ctx.lineTo(3, -38 + yOff);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#FFC0CB";
  ctx.beginPath();
  ctx.moveTo(7, -34 + yOff); ctx.lineTo(12, -41 + yOff); ctx.lineTo(4, -38 + yOff);
  ctx.closePath(); ctx.fill();

  // Eye + shine
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(10.5, -29 + yOff, 2.0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath(); ctx.arc(11.2, -29.6 + yOff, 0.7, 0, Math.PI * 2); ctx.fill();

  // Nibble paws
  if (sq.state === "nibble") {
    ctx.strokeStyle = "#7C3400"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(4, -5 + yOff); ctx.lineTo(10, -15 + yOff); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -5 + yOff); ctx.lineTo(0,  -15 + yOff); ctx.stroke();
  }

  // Running legs
  if (sq.state === "run") {
    ctx.strokeStyle = "#7C3400"; ctx.lineWidth = 3; ctx.lineCap = "round";
    const ls = Math.sin(sq.legPhase);
    ([[ 5, -3, 0], [-4, -1, Math.PI]] as [number, number, number][]).forEach(([bx, by, off]) => {
      ctx.beginPath();
      ctx.moveTo(bx, by + yOff);
      ctx.lineTo(bx + Math.sin(ls + off) * 10, by + 12 + yOff);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(bx, by + yOff);
      ctx.lineTo(bx + Math.sin(ls + off + Math.PI) * 10, by + 12 + yOff);
      ctx.stroke();
    });
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Apple — falls with tumble rotation
// ---------------------------------------------------------------------------

function drawApple(ctx: CanvasRenderingContext2D, a: Apple) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rot);
  ctx.fillStyle = "#DC2626";
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.bezierCurveTo(11, -9, 13, 2, 11, 9);
  ctx.bezierCurveTo(9, 15, 2, 17, 0, 17);
  ctx.bezierCurveTo(-2, 17, -9, 15, -11, 9);
  ctx.bezierCurveTo(-13, 2, -11, -9, 0, -9);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath(); ctx.ellipse(-3, -2, 3.5, 5, -0.4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#7C4500"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(4, -18, 2, -22); ctx.stroke();
  ctx.fillStyle = "#2E7D32";
  ctx.beginPath();
  ctx.moveTo(2, -16); ctx.quadraticCurveTo(11, -22, 8, -13);
  ctx.quadraticCurveTo(5, -11, 2, -16); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Scene init
// ---------------------------------------------------------------------------

function initScene(mobile: boolean): Scene {
  const numBirds = mobile ? 2 : 3;
  const birds: Bird[] = [];
  for (let i = 0; i < numBirds; i++) {
    const baseY = CANOPY_CY - CANOPY_R * 0.4 + (i - 1) * CANOPY_R * 0.14;
    birds.push({
      x:         -2000 + i * 1300,
      y:         baseY,
      vx:        (2.2 + Math.random() * 2.2) * (i % 2 === 0 ? 1 : -1),
      baseY,
      wing:      Math.random() * Math.PI * 2,
      wingSpeed: 0.10 + Math.random() * 0.06,
      size:      mobile ? 18 : 21,
    });
  }

  return {
    wind: { value: 0, target: 0.1, timer: 3000 },
    leaves: [],
    birds,
    squirrel: {
      x:           -TRUNK_W * 2.8,
      y:           BRANCH_Y,
      tx:          TRUNK_W * 3.2,
      speed:       1.8,
      dir:         1,
      legPhase:    0,
      tailPhase:   0,
      state:       "run",
      idleLeft:    0,
      nibblePhase: 0,
    },
    apples: [
      { x: 0, y: 0, vy: 0, rot: 0, rotV: 0, active: false },
      { x: 0, y: 0, vy: 0, rot: 0, rotV: 0, active: false },
    ],
    clouds: [
      { x: 0, y: 0, speed: 0.10, scale: 1.10 },
      { x: 0, y: 0, speed: 0.07, scale: 0.82 },
      { x: 0, y: 0, speed: 0.13, scale: 1.28 },
    ],
    nextLeaf:  200,
    nextApple: 8000,
  };
}

function resetClouds(scene: Scene, w: number, h: number) {
  scene.clouds[0] = { ...scene.clouds[0], x: w * 0.12, y: h * 0.07 };
  scene.clouds[1] = { ...scene.clouds[1], x: w * 0.52, y: h * 0.04 };
  scene.clouds[2] = { ...scene.clouds[2], x: w * 0.78, y: h * 0.12 };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

function update(scene: Scene, dt: number, mobile: boolean) {
  const s = dt / 16.67;
  const maxLeaves = mobile ? 14 : 24;

  // Wind — occasional gusts
  scene.wind.timer -= dt;
  if (scene.wind.timer <= 0) {
    scene.wind.target = (Math.random() - 0.5) * 1.4;
    scene.wind.timer  = 2000 + Math.random() * 5000;
  }
  scene.wind.value += (scene.wind.target - scene.wind.value) * 0.008 * s;
  const wind = scene.wind.value;

  // Leaves — pendulum flutter driven by wind
  scene.leaves = scene.leaves.filter(l => l.opacity > 0.02);
  scene.leaves.forEach(l => {
    l.swingV += (-l.swingAngle * 0.04 + wind * 0.08) * s;
    l.swingV  *= 0.96;
    l.swingAngle += l.swingV * s;
    l.rot  = l.swingAngle + Math.sin(l.phase + l.y * 0.005) * 0.3;
    l.vx   = l.swingAngle * 2.5 + wind * 1.3 + Math.sin(l.phase + l.y * 0.003) * 0.4;
    l.x   += l.vx * s;
    l.y   += l.vy * s;
    l.vy   = Math.min(l.vy + 0.04 * s, 3.8);
    if (l.y > TRUNK_BASE_Y + 80) l.opacity -= 0.022 * s;
    if (l.x < -2500 || l.x > 2500) l.opacity -= 0.06 * s;
  });
  scene.nextLeaf -= dt;
  if (scene.nextLeaf <= 0 && scene.leaves.length < maxLeaves) {
    scene.nextLeaf = 400 + Math.random() * 760;
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * CANOPY_R * 0.80;
    scene.leaves.push({
      x:          CANOPY_CX + Math.cos(a) * d,
      y:          CANOPY_CY + Math.sin(a) * d * 0.5,
      vx:         wind * 1.2,
      vy:         0.7 + Math.random() * 1.3,
      swingAngle: (Math.random() - 0.5) * 0.7,
      swingV:     (Math.random() - 0.5) * 0.05,
      rot:        Math.random() * Math.PI * 2,
      size:       10 + Math.random() * 14,
      color:      LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      opacity:    1,
      phase:      Math.random() * Math.PI * 2,
    });
  }

  // Birds — sinusoidal altitude arc + wind drift
  scene.birds.forEach(b => {
    b.x    += (b.vx + wind * 0.4) * s;
    b.wing += b.wingSpeed * s * 7;
    const targetY = b.baseY + Math.sin(b.x * 0.0018) * 70;
    b.y   += (targetY - b.y) * 0.018 * s;
    if (b.x >  2800) { b.x = -2800; b.y = b.baseY; }
    if (b.x < -2800) { b.x =  2800; b.y = b.baseY; }
  });

  // Squirrel
  const sq = scene.squirrel;
  sq.tailPhase += 0.045 * s;  // tail always waves

  if (sq.state === "run") {
    sq.legPhase += 0.22 * s;
    const dx = sq.tx - sq.x;
    if (Math.abs(dx) < 4) {
      sq.state     = Math.random() > 0.4 ? "nibble" : "idle";
      sq.idleLeft  = 1200 + Math.random() * 3000;
      sq.nibblePhase = 0;
    } else {
      sq.x   += Math.sign(dx) * sq.speed * s;
      sq.dir  = Math.sign(dx) as 1 | -1;
    }
  } else if (sq.state === "nibble") {
    sq.nibblePhase += 0.06 * s;
    sq.idleLeft    -= dt;
    if (sq.idleLeft <= 0) {
      sq.state = "run";
      sq.tx    = (Math.random() - 0.5) * TRUNK_W * 9;
    }
  } else {
    sq.idleLeft -= dt;
    if (sq.idleLeft <= 0) {
      sq.state = "run";
      sq.tx    = (Math.random() - 0.5) * TRUNK_W * 9;
    }
  }

  // Apples — tumble as they fall
  scene.apples.forEach(a => {
    if (!a.active) return;
    a.vy  += 0.35 * s;
    a.y   += a.vy * s;
    a.rot += a.rotV * s;
    a.rotV *= 0.995;
    if (a.y > TRUNK_BASE_Y + 30) a.active = false;
  });
  scene.nextApple -= dt;
  if (scene.nextApple <= 0) {
    scene.nextApple = 12000 + Math.random() * 20000;
    const idle = scene.apples.find(a => !a.active);
    if (idle) {
      const ang = Math.random() * Math.PI * 2;
      const d   = Math.random() * CANOPY_R * 0.50;
      idle.x    = CANOPY_CX + Math.cos(ang) * d;
      idle.y    = CANOPY_CY + Math.sin(ang) * d * 0.4;
      idle.vy   = 0.3;
      idle.rot  = 0;
      idle.rotV = (Math.random() - 0.5) * 0.08;
      idle.active = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render(
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  w: number,
  h: number,
  vp: { x: number; y: number; zoom: number },
  t: number,
) {
  ctx.clearRect(0, 0, w, h);

  ctx.save(); drawSky(ctx, w, h); ctx.restore();

  ctx.save();
  scene.clouds.forEach(c => {
    c.x += c.speed * (1 + scene.wind.value * 0.5);
    if (c.x > w * 1.5) c.x = -w * 0.35;
    drawCloud(ctx, c.x, c.y, c.scale);
  });
  ctx.restore();

  ctx.save();
  ctx.translate(vp.x, vp.y);
  ctx.scale(vp.zoom, vp.zoom);

  drawGround(ctx, t, scene.wind.value);
  drawTrunk(ctx, t, scene.wind.value);
  drawCanopy(ctx, t, scene.wind.value);
  scene.leaves.forEach(l => drawLeaf(ctx, l));
  drawSquirrel(ctx, scene.squirrel);
  scene.apples.filter(a => a.active).forEach(a => drawApple(ctx, a));
  scene.birds.forEach(b => drawBird(ctx, b));

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NatureCanvas({
  viewportRef,
}: {
  viewportRef: MutableRefObject<{ x: number; y: number; zoom: number }>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const sceneRef  = useRef<Scene | null>(null);
  const lastTRef  = useRef(0);
  const mobileRef = useRef(false);
  const sizeRef   = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = rect.width, h = rect.height;
      sizeRef.current = { w, h };
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mobileRef.current = w < 768;
      if (!sceneRef.current) {
        sceneRef.current = initScene(mobileRef.current);
      }
      resetClouds(sceneRef.current, w, h);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function loop(t: number) {
      const scene = sceneRef.current;
      if (!scene) { rafRef.current = requestAnimationFrame(loop); return; }

      const dt = Math.min(t - lastTRef.current, 50);
      lastTRef.current = t;

      if (document.visibilityState === "visible") {
        const { w, h } = sizeRef.current;
        update(scene, dt, mobileRef.current);
        render(ctx!, scene, w, h, viewportRef.current, t);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [viewportRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
