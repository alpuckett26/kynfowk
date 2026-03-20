"use client";

import type { MutableRefObject } from "react";
import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Leaf {
  x: number; y: number;
  vx: number; vy: number;
  rotation: number; rotSpeed: number;
  size: number; color: string; opacity: number;
}

interface Bird {
  x: number; y: number;
  vx: number; vy: number;
  wing: number; wingSpeed: number;
  size: number;
}

interface Squirrel {
  x: number; y: number;
  tx: number; speed: number;
  dir: 1 | -1;
  leg: number;
  state: "run" | "idle";
  idleLeft: number;
}

interface Apple {
  x: number; y: number;
  vy: number; active: boolean;
}

interface Cloud {
  x: number; y: number;
  vx: number; scale: number;
}

interface Scene {
  leaves: Leaf[];
  birds: Bird[];
  squirrels: Squirrel[];
  apples: Apple[];
  clouds: Cloud[];
  nextLeaf: number;
  nextApple: number;
}

// ---------------------------------------------------------------------------
// World-space constants — tree centred at x=0, branches in React Flow coords
// ---------------------------------------------------------------------------

const TRUNK_X      = 0;
const TRUNK_BASE_Y = 820;
const TRUNK_TOP_Y  = 60;
const TRUNK_W      = 100;
const BRANCH_Y     = 320;   // squirrel lives here
const CANOPY_CX    = 0;
const CANOPY_CY    = 100;
const CANOPY_R     = 580;

const LEAF_COLORS = [
  "#2D8A3E", "#3DAA50", "#52B788",
  "#F59E0B", "#FBBF24", "#E86A1A", "#EF4444",
];

// ---------------------------------------------------------------------------
// Sky + sun  (screen-space — drawn before viewport transform)
// ---------------------------------------------------------------------------

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0,   "#2E8BC0");
  g.addColorStop(0.5, "#87CEEB");
  g.addColorStop(1,   "#FFE4B5");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sun
  const sx = w * 0.82, sy = h * 0.09;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.16);
  glow.addColorStop(0, "rgba(255,248,150,0.6)");
  glow.addColorStop(1, "rgba(255,248,150,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(sx, sy, h * 0.16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFD700";
  ctx.beginPath(); ctx.arc(sx, sy, h * 0.048, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFF59D";
  ctx.beginPath(); ctx.arc(sx - 2, sy - 3, h * 0.034, 0, Math.PI * 2); ctx.fill();
}

// ---------------------------------------------------------------------------
// Clouds  (screen-space)
// ---------------------------------------------------------------------------

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.shadowColor = "rgba(120,180,220,0.3)"; ctx.shadowBlur = 8;
  const p = (dx: number, dy: number, r: number) => {
    ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill();
  };
  p(0, 0, 20); p(-19, 8, 16); p(19, 8, 16);
  p(-33, 14, 12); p(33, 14, 12);
  p(-9, -11, 15); p(9, -9, 13);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Ground  (world-space)
// ---------------------------------------------------------------------------

function drawGround(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, TRUNK_BASE_Y, 0, TRUNK_BASE_Y + 500);
  g.addColorStop(0,   "#4A7C3F");
  g.addColorStop(0.3, "#3D6B34");
  g.addColorStop(1,   "#2D5226");
  ctx.fillStyle = g;
  ctx.fillRect(-80000, TRUNK_BASE_Y, 160000, 2000);

  // Grass blades
  ctx.strokeStyle = "#5EA34F"; ctx.lineWidth = 2; ctx.lineCap = "round";
  for (let i = -1200; i < 1200; i += 8) {
    const ht = 4 + Math.sin(i * 0.72) * 3;
    ctx.beginPath();
    ctx.moveTo(i, TRUNK_BASE_Y);
    ctx.lineTo(i + Math.sin(i * 1.3) * 2.5, TRUNK_BASE_Y - ht);
    ctx.stroke();
  }

  // Wildflowers
  const flowers: [number, string][] = [
    [-860, "#FF69B4"], [-610, "#FFD700"], [-370, "#FF9999"],
    [180, "#FFD700"], [430, "#FF69B4"], [680, "#FFFFFF"], [910, "#FFD700"],
  ];
  flowers.forEach(([fx, col]) => {
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(fx + Math.cos(a) * 5, TRUNK_BASE_Y + 5 + Math.sin(a) * 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#FFD700";
    ctx.beginPath(); ctx.arc(fx, TRUNK_BASE_Y + 5, 2.5, 0, Math.PI * 2); ctx.fill();
  });
}

// ---------------------------------------------------------------------------
// Trunk + branches  (world-space)
// ---------------------------------------------------------------------------

function drawTrunk(ctx: CanvasRenderingContext2D, t: number) {
  const sw = Math.sin(t * 0.00038) * 4;

  // Drop shadow
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.beginPath();
  ctx.moveTo(TRUNK_X - TRUNK_W * 0.46 + 10, TRUNK_BASE_Y);
  ctx.bezierCurveTo(TRUNK_X - TRUNK_W * 0.26 + 10, TRUNK_BASE_Y - 280,
                    TRUNK_X - TRUNK_W * 0.18 + 10, TRUNK_BASE_Y - 580,
                    TRUNK_X - TRUNK_W * 0.16 + sw + 10, TRUNK_TOP_Y);
  ctx.lineTo(TRUNK_X + TRUNK_W * 0.16 + sw + 10, TRUNK_TOP_Y);
  ctx.bezierCurveTo(TRUNK_X + TRUNK_W * 0.18 + 10, TRUNK_BASE_Y - 580,
                    TRUNK_X + TRUNK_W * 0.26 + 10, TRUNK_BASE_Y - 280,
                    TRUNK_X + TRUNK_W * 0.46 + 10, TRUNK_BASE_Y);
  ctx.closePath(); ctx.fill();

  // Trunk body
  const tg = ctx.createLinearGradient(TRUNK_X - TRUNK_W * 0.5, 0, TRUNK_X + TRUNK_W * 0.5, 0);
  tg.addColorStop(0,    "#5C3200");
  tg.addColorStop(0.25, "#8B5E3C");
  tg.addColorStop(0.65, "#7C4A20");
  tg.addColorStop(1,    "#5C3200");
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(TRUNK_X - TRUNK_W * 0.46, TRUNK_BASE_Y);
  ctx.bezierCurveTo(TRUNK_X - TRUNK_W * 0.26, TRUNK_BASE_Y - 280,
                    TRUNK_X - TRUNK_W * 0.18, TRUNK_BASE_Y - 580,
                    TRUNK_X - TRUNK_W * 0.16 + sw, TRUNK_TOP_Y);
  ctx.lineTo(TRUNK_X + TRUNK_W * 0.16 + sw, TRUNK_TOP_Y);
  ctx.bezierCurveTo(TRUNK_X + TRUNK_W * 0.18, TRUNK_BASE_Y - 580,
                    TRUNK_X + TRUNK_W * 0.26, TRUNK_BASE_Y - 280,
                    TRUNK_X + TRUNK_W * 0.46, TRUNK_BASE_Y);
  ctx.closePath(); ctx.fill();

  // Bark lines
  ctx.strokeStyle = "rgba(0,0,0,0.10)"; ctx.lineWidth = 2; ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const lx = TRUNK_X - TRUNK_W * 0.32 + i * TRUNK_W * 0.16;
    ctx.beginPath();
    ctx.moveTo(lx, TRUNK_BASE_Y - 20);
    ctx.quadraticCurveTo(lx + (i % 2 ? 6 : -6), TRUNK_BASE_Y - 380, lx + sw * 0.4, TRUNK_TOP_Y + 50);
    ctx.stroke();
  }

  // Left branch
  ctx.strokeStyle = "#7C4A20"; ctx.lineWidth = TRUNK_W * 0.26; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(TRUNK_X - TRUNK_W * 0.12 + sw * 0.4, BRANCH_Y);
  ctx.quadraticCurveTo(TRUNK_X - TRUNK_W * 2.2 + sw, BRANCH_Y - 70, TRUNK_X - TRUNK_W * 4.2 + sw * 1.6, BRANCH_Y + 20);
  ctx.stroke();

  // Right branch
  ctx.lineWidth = TRUNK_W * 0.22;
  ctx.beginPath();
  ctx.moveTo(TRUNK_X + TRUNK_W * 0.12 + sw * 0.4, BRANCH_Y - 35);
  ctx.quadraticCurveTo(TRUNK_X + TRUNK_W * 2 + sw, BRANCH_Y - 130, TRUNK_X + TRUNK_W * 3.8 + sw * 1.6, BRANCH_Y - 55);
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Canopy  (world-space, gently sways)
// ---------------------------------------------------------------------------

function drawCanopy(ctx: CanvasRenderingContext2D, t: number) {
  const sw = Math.sin(t * 0.00038) * 9;

  const clusters: [number, number, number][] = [
    [0, 0, CANOPY_R],
    [-CANOPY_R * 0.44, CANOPY_R * 0.12, CANOPY_R * 0.70],
    [ CANOPY_R * 0.44, CANOPY_R * 0.12, CANOPY_R * 0.70],
    [-CANOPY_R * 0.20, -CANOPY_R * 0.30, CANOPY_R * 0.64],
    [ CANOPY_R * 0.20, -CANOPY_R * 0.26, CANOPY_R * 0.64],
    [-CANOPY_R * 0.54, -CANOPY_R * 0.08, CANOPY_R * 0.50],
    [ CANOPY_R * 0.54, -CANOPY_R * 0.08, CANOPY_R * 0.50],
  ];

  const draw = (color: string, ox: number, oy: number, rScale: number) => {
    ctx.fillStyle = color;
    clusters.forEach(([dx, dy, r]) => {
      ctx.beginPath();
      ctx.arc(CANOPY_CX + dx * rScale + sw + ox, CANOPY_CY + dy * rScale + oy, r * rScale, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // Shadow pass
  ctx.fillStyle = "rgba(0,40,0,0.20)";
  clusters.forEach(([dx, dy, r]) => {
    ctx.beginPath();
    ctx.arc(CANOPY_CX + dx + sw + 12, CANOPY_CY + dy + 12, r, 0, Math.PI * 2);
    ctx.fill();
  });

  draw("#1A5C1E", 0,  0,  1.00);   // deep base
  draw("#2E7D32", 0, -5,  0.86);   // mid green
  draw("#388E3C", -3, -12, 0.70);  // brighter
  draw("#43A047", -5, -20, 0.55);  // highlight
  draw("#66BB6A", -7, -28, 0.38);  // lightest top
}

// ---------------------------------------------------------------------------
// Falling leaf
// ---------------------------------------------------------------------------

function drawLeaf(ctx: CanvasRenderingContext2D, l: Leaf) {
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.rotation);
  ctx.globalAlpha = l.opacity;
  ctx.fillStyle = l.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, l.size * 0.34, l.size * 0.60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.12)"; ctx.lineWidth = l.size * 0.07;
  ctx.beginPath(); ctx.moveTo(0, -l.size * 0.56); ctx.lineTo(0, l.size * 0.56); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Bird
// ---------------------------------------------------------------------------

function drawBird(ctx: CanvasRenderingContext2D, b: Bird) {
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.vx < 0) ctx.scale(-1, 1);
  const w = Math.sin(b.wing) * 0.55;
  ctx.strokeStyle = "#1A1A2E";
  ctx.lineWidth = Math.max(1.5, b.size * 0.13);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-b.size * 0.55, -b.size * w, -b.size * 1.1, -b.size * 0.12 + b.size * w * 0.18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo( b.size * 0.55, -b.size * w,  b.size * 1.1, -b.size * 0.12 + b.size * w * 0.18);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Squirrel  (runs along the main branch)
// ---------------------------------------------------------------------------

function drawSquirrel(ctx: CanvasRenderingContext2D, sq: Squirrel) {
  ctx.save();
  ctx.translate(sq.x, sq.y);
  if (sq.dir < 0) ctx.scale(-1, 1);
  const bob = sq.state === "run" ? Math.sin(sq.leg * 2) * 2.5 : 0;
  const ls  = Math.sin(sq.leg);

  // Fluffy tail
  ctx.strokeStyle = "#92400E"; ctx.lineWidth = 9; ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-3, -10 + bob);
  ctx.bezierCurveTo(-12, -26 + bob, -26, -30 + bob, -24, -46 + bob);
  ctx.bezierCurveTo(-22, -56 + bob, -8, -52 + bob, -6, -42 + bob);
  ctx.stroke();
  ctx.strokeStyle = "#B45309"; ctx.lineWidth = 4; ctx.stroke();

  // Body
  ctx.fillStyle = "#92400E";
  ctx.beginPath();
  ctx.ellipse(0, -10 + bob, 9, 13, 0.15, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath(); ctx.arc(6, -26 + bob, 8, 0, Math.PI * 2); ctx.fill();

  // Ear
  ctx.fillStyle = "#7C3400";
  ctx.beginPath();
  ctx.moveTo(7, -32 + bob); ctx.lineTo(12, -41 + bob); ctx.lineTo(3, -37 + bob);
  ctx.closePath(); ctx.fill();

  // Eye
  ctx.fillStyle = "#111";
  ctx.beginPath(); ctx.arc(9.5, -28 + bob, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath(); ctx.arc(10.2, -28.5 + bob, 0.6, 0, Math.PI * 2); ctx.fill();

  // Legs
  ctx.strokeStyle = "#7C3400"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ([[ 5, -3, 0], [-4, -1, Math.PI]] as [number, number, number][]).forEach(([bx, by, off]) => {
    ctx.beginPath();
    ctx.moveTo(bx, by + bob);
    ctx.lineTo(bx + Math.sin(ls + off) * 10, by + 12 + bob);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by + bob);
    ctx.lineTo(bx + Math.sin(ls + off + Math.PI) * 10, by + 12 + bob);
    ctx.stroke();
  });

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Apple
// ---------------------------------------------------------------------------

function drawApple(ctx: CanvasRenderingContext2D, a: Apple) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.fillStyle = "#DC2626";
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.bezierCurveTo(11, -9, 13, 2, 11, 9);
  ctx.bezierCurveTo(9, 15, 2, 17, 0, 17);
  ctx.bezierCurveTo(-2, 17, -9, 15, -11, 9);
  ctx.bezierCurveTo(-13, 2, -11, -9, 0, -9);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath(); ctx.ellipse(-3, -3, 3.5, 4.5, -0.4, 0, Math.PI * 2); ctx.fill();
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
    birds.push({
      x: -1800 + i * 1400,
      y: CANOPY_CY - CANOPY_R * 0.35 + (Math.random() - 0.5) * CANOPY_R * 0.25,
      vx: (2.5 + Math.random() * 2.5) * (Math.random() > 0.5 ? 1 : -1),
      vy: 0,
      wing: Math.random() * Math.PI * 2,
      wingSpeed: 0.12 + Math.random() * 0.07,
      size: mobile ? 18 : 22,
    });
  }

  return {
    leaves: [],
    birds,
    squirrels: [{
      x: -TRUNK_W * 2.8,
      y: BRANCH_Y,
      tx:  TRUNK_W * 3.2,
      speed: 1.8,
      dir: 1,
      leg: 0,
      state: "run",
      idleLeft: 0,
    }],
    apples: [
      { x: 0, y: 0, vy: 0, active: false },
      { x: 0, y: 0, vy: 0, active: false },
    ],
    clouds: [
      { x: 0, y: 0, vx: 0.10, scale: 1.10 },
      { x: 0, y: 0, vx: 0.07, scale: 0.82 },
      { x: 0, y: 0, vx: 0.13, scale: 1.28 },
    ],
    nextLeaf: 300,
    nextApple: 7000,
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
  const maxLeaves = mobile ? 12 : 22;

  // Leaves
  scene.leaves = scene.leaves.filter(l => l.opacity > 0.02);
  scene.leaves.forEach(l => {
    l.x += (l.vx + Math.sin(l.y * 0.004 + l.x * 0.002) * 0.7) * s;
    l.y += l.vy * s;
    l.rotation += l.rotSpeed * s;
    if (l.y > TRUNK_BASE_Y + 80) l.opacity -= 0.018 * s;
    if (l.x < -2200 || l.x > 2200) l.opacity -= 0.05 * s;
  });
  scene.nextLeaf -= dt;
  if (scene.nextLeaf <= 0 && scene.leaves.length < maxLeaves) {
    scene.nextLeaf = 480 + Math.random() * 860;
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * CANOPY_R * 0.78;
    scene.leaves.push({
      x: CANOPY_CX + Math.cos(a) * d,
      y: CANOPY_CY + Math.sin(a) * d * 0.55,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 1.4 + Math.random() * 2.2,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.09,
      size: 11 + Math.random() * 14,
      color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
      opacity: 1,
    });
  }

  // Birds
  scene.birds.forEach(b => {
    b.x += b.vx * s;
    b.y += Math.sin(b.wing * 0.18) * 0.3 * s;
    b.wing += b.wingSpeed * s * 8;
    if (b.x >  2600) { b.x = -2600; b.y = CANOPY_CY - CANOPY_R * 0.35 + (Math.random() - 0.5) * CANOPY_R * 0.25; }
    if (b.x < -2600) { b.x =  2600; b.y = CANOPY_CY - CANOPY_R * 0.35 + (Math.random() - 0.5) * CANOPY_R * 0.25; }
  });

  // Squirrel
  scene.squirrels.forEach(sq => {
    if (sq.state === "run") {
      sq.leg += 0.22 * s;
      const dx = sq.tx - sq.x;
      if (Math.abs(dx) < 4) {
        sq.state = "idle";
        sq.idleLeft = 1000 + Math.random() * 2800;
      } else {
        sq.x += Math.sign(dx) * sq.speed * s;
        sq.dir = Math.sign(dx) as 1 | -1;
      }
    } else {
      sq.idleLeft -= dt;
      if (sq.idleLeft <= 0) {
        sq.state = "run";
        sq.tx = (Math.random() - 0.5) * TRUNK_W * 9;
      }
    }
  });

  // Apples
  scene.apples.forEach(a => {
    if (!a.active) return;
    a.vy += 0.32 * s;
    a.y  += a.vy * s;
    if (a.y > TRUNK_BASE_Y + 40) a.active = false;
  });
  scene.nextApple -= dt;
  if (scene.nextApple <= 0) {
    scene.nextApple = 10000 + Math.random() * 18000;
    const idle = scene.apples.find(a => !a.active);
    if (idle) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * CANOPY_R * 0.55;
      idle.x  = CANOPY_CX + Math.cos(a) * d;
      idle.y  = CANOPY_CY + Math.sin(a) * d * 0.4;
      idle.vy = 0.4;
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

  // ── Screen-space sky ──
  ctx.save();
  drawSky(ctx, w, h);
  ctx.restore();

  // ── Screen-space clouds ──
  ctx.save();
  scene.clouds.forEach(c => {
    c.x += c.vx;
    if (c.x > w * 1.45) c.x = -w * 0.3;
    drawCloud(ctx, c.x, c.y, c.scale);
  });
  ctx.restore();

  // ── World-space elements (synced to React Flow viewport) ──
  ctx.save();
  ctx.translate(vp.x, vp.y);
  ctx.scale(vp.zoom, vp.zoom);

  drawGround(ctx);
  drawTrunk(ctx, t);
  drawCanopy(ctx, t);
  scene.leaves.forEach(l => drawLeaf(ctx, l));
  scene.squirrels.forEach(sq => drawSquirrel(ctx, sq));
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
