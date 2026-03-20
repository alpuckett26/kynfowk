"use client";

import type { MutableRefObject } from "react";
import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Bokeh {
  x: number; y: number;
  r: number;
  rgb: string;        // "r,g,b" for rgba()
  peak: number;       // max alpha
  vx: number; vy: number;
  phase: number;      // pulse offset
}

interface DriftLeaf {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; rotV: number;
  size: number;
  opacity: number;
  color: string;
}

interface Scene {
  bokeh: Bokeh[];
  leaves: DriftLeaf[];
  nextLeaf: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORLD_W = 3200;
const WORLD_H = 2200;

// [rgb, peak-alpha] — warm dappled-light palette
const BOKEH_PALETTE: [string, number][] = [
  ["255,218,90",  0.22],
  ["255,240,180", 0.18],
  ["140,210,155", 0.20],
  ["100,185,215", 0.16],
  ["255,200,110", 0.24],
  ["195,235,195", 0.15],
  ["255,228,140", 0.20],
];

const LEAF_COLORS = [
  "60,120,60",
  "80,155,75",
  "195,155,55",
  "175,95,38",
  "215,175,75",
];

// ---------------------------------------------------------------------------
// Sky gradient — screen-space
// ---------------------------------------------------------------------------

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0,    "#193544");
  g.addColorStop(0.32, "#3E7F98");
  g.addColorStop(0.68, "#92C8DF");
  g.addColorStop(1,    "#EDE0C4");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Sun haze
  const sx = w * 0.80, sy = h * 0.08;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.52);
  glow.addColorStop(0,   "rgba(255,242,165,0.26)");
  glow.addColorStop(0.45,"rgba(255,222,100,0.07)");
  glow.addColorStop(1,   "rgba(255,222,100,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------
// Bokeh orb — soft radial gradient, no ctx.filter needed
// ---------------------------------------------------------------------------

function drawBokeh(ctx: CanvasRenderingContext2D, b: Bokeh, t: number) {
  const pulse = 0.82 + Math.sin(t * 0.00055 + b.phase) * 0.18;
  const a = b.peak * pulse;

  const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
  g.addColorStop(0,    `rgba(${b.rgb},${(a * 0.88).toFixed(3)})`);
  g.addColorStop(0.30, `rgba(${b.rgb},${(a * 0.48).toFixed(3)})`);
  g.addColorStop(0.65, `rgba(${b.rgb},${(a * 0.12).toFixed(3)})`);
  g.addColorStop(1,    `rgba(${b.rgb},0)`);

  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------
// Drift leaf — minimal translucent ellipse
// ---------------------------------------------------------------------------

function drawDriftLeaf(ctx: CanvasRenderingContext2D, l: DriftLeaf) {
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.rot);
  ctx.globalAlpha = l.opacity;
  ctx.fillStyle = l.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, l.size * 0.27, l.size * 0.60, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Scene init
// ---------------------------------------------------------------------------

function initScene(mobile: boolean): Scene {
  const count = mobile ? 26 : 44;
  const bokeh: Bokeh[] = [];

  for (let i = 0; i < count; i++) {
    const [rgb, peak] = BOKEH_PALETTE[i % BOKEH_PALETTE.length];
    bokeh.push({
      x:     (Math.random() - 0.5) * WORLD_W,
      y:     (Math.random() - 0.5) * WORLD_H,
      r:     55 + Math.random() * 230,
      rgb,
      peak:  peak * (0.65 + Math.random() * 0.7),
      vx:    (Math.random() - 0.5) * 0.16,
      vy:    (Math.random() - 0.5) * 0.09,
      phase: Math.random() * Math.PI * 2,
    });
  }

  return { bokeh, leaves: [], nextLeaf: 600 };
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

function update(scene: Scene, dt: number, mobile: boolean) {
  const s = dt / 16.67;
  const hw = WORLD_W * 0.5, hh = WORLD_H * 0.5;

  // Drift bokeh slowly, wrap at world edges
  scene.bokeh.forEach(b => {
    b.x += b.vx * s;
    b.y += b.vy * s;
    if (b.x >  hw) b.x = -hw;
    if (b.x < -hw) b.x =  hw;
    if (b.y >  hh) b.y = -hh;
    if (b.y < -hh) b.y =  hh;
  });

  // Drift leaves — slow, nearly transparent
  const maxLeaves = mobile ? 8 : 14;
  scene.leaves = scene.leaves.filter(l => l.opacity > 0.005);
  scene.leaves.forEach(l => {
    l.x   += l.vx * s;
    l.y   += l.vy * s;
    l.rot += l.rotV * s;
    if (l.y > hh + 120 || l.x < -hw - 120 || l.x > hw + 120) {
      l.opacity -= 0.012 * s;
    }
  });

  scene.nextLeaf -= dt;
  if (scene.nextLeaf <= 0 && scene.leaves.length < maxLeaves) {
    scene.nextLeaf = 900 + Math.random() * 1800;
    const col = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
    const opac = 0.12 + Math.random() * 0.11;
    scene.leaves.push({
      x:       (Math.random() - 0.5) * WORLD_W * 0.8,
      y:       -hh * 0.6 + Math.random() * hh * 0.4,
      vx:      (Math.random() - 0.5) * 0.35,
      vy:      0.25 + Math.random() * 0.45,
      rot:     Math.random() * Math.PI * 2,
      rotV:    (Math.random() - 0.5) * 0.018,
      size:    20 + Math.random() * 30,
      opacity: opac,
      color:   `rgba(${col},${opac.toFixed(2)})`,
    });
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

  // Sky is screen-space (always fills canvas regardless of zoom)
  ctx.save();
  drawSky(ctx, w, h);
  ctx.restore();

  // Bokeh + leaves are world-space (sync with React Flow viewport)
  ctx.save();
  ctx.translate(vp.x, vp.y);
  ctx.scale(vp.zoom, vp.zoom);

  scene.bokeh.forEach(b => drawBokeh(ctx, b, t));
  scene.leaves.forEach(l => drawDriftLeaf(ctx, l));

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
      if (!sceneRef.current) sceneRef.current = initScene(mobileRef.current);
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
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [viewportRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}
