"use client";

import { useEffect, useRef, useState } from "react";

const CLIPS = [
  {
    src: "https://assets.mixkit.co/videos/4523/4523-1080.mp4",
    fallback: "https://assets.mixkit.co/videos/4523/4523-360.mp4",
    headline: "Keep your family close,\nno matter the distance.",
  },
  {
    src: "https://assets.mixkit.co/videos/39798/39798-1080.mp4",
    fallback: "https://assets.mixkit.co/videos/39798/39798-360.mp4",
    headline: "Find the window.\nMake the call.",
  },
  {
    src: "https://assets.mixkit.co/videos/39800/39800-1080.mp4",
    fallback: "https://assets.mixkit.co/videos/39800/39800-360.mp4",
    headline: "Every call logged.\nEvery moment counted.",
  },
];

export function PromoReel() {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function advance() {
    setFading(true);
    setTimeout(() => {
      setIndex((i) => (i + 1) % CLIPS.length);
      setFading(false);
    }, 500);
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    video.play().catch(() => {});
  }, [index]);

  const clip = CLIPS[index];

  return (
    <div className="promo-reel">
      <video
        ref={videoRef}
        className={`promo-reel-video${fading ? " promo-reel-fading" : ""}`}
        muted
        playsInline
        autoPlay
        onEnded={advance}
      >
        <source src={clip.src} type="video/mp4" />
        <source src={clip.fallback} type="video/mp4" />
      </video>

      <div className={`promo-reel-overlay${fading ? " promo-reel-fading" : ""}`}>
        <p className="promo-reel-brand">Kynfowk</p>
        <p className="promo-reel-headline">
          {clip.headline.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < clip.headline.split("\n").length - 1 && <br />}
            </span>
          ))}
        </p>
        <p className="promo-reel-sub">Add your family photos to see them here.</p>
      </div>

      <div className="promo-reel-dots">
        {CLIPS.map((_, i) => (
          <button
            key={i}
            className={`promo-reel-dot${i === index ? " promo-reel-dot-active" : ""}`}
            onClick={() => { setFading(false); setIndex(i); }}
            aria-label={`Clip ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
