"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIDEO_CLIPS = [
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

type VideoSlide = { kind: "video"; src: string; fallback: string; headline: string };
type PhotoSlide = { kind: "photo"; id: string; photoUrl: string; caption: string | null; displayName: string };
type Slide = VideoSlide | PhotoSlide;

function buildSlides(photos: Array<{ id: string; photoUrl: string; caption: string | null; displayName: string }>): Slide[] {
  const photoSlides: PhotoSlide[] = photos.map((p) => ({ kind: "photo", ...p }));
  const slides: Slide[] = [];
  for (let i = 0; i < VIDEO_CLIPS.length; i++) {
    slides.push({ kind: "video", ...VIDEO_CLIPS[i] });
    if (i < photoSlides.length) slides.push(photoSlides[i]);
  }
  for (let i = VIDEO_CLIPS.length; i < photoSlides.length; i++) {
    slides.push(photoSlides[i]);
  }
  return slides;
}

interface PromoReelProps {
  photos?: Array<{ id: string; photoUrl: string; caption: string | null; displayName: string }>;
}

export function PromoReel({ photos = [] }: PromoReelProps) {
  const slides = buildSlides(photos);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const advance = useCallback(() => {
    setVisible(false);
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
      setVisible(true);
    }, 400);
  }, [slides.length]);

  // Auto-advance photo slides after 5s
  useEffect(() => {
    const slide = slides[index];
    if (slide.kind !== "photo") return;
    const t = setTimeout(advance, 5000);
    return () => clearTimeout(t);
  }, [index, slides, advance]);

  // Play video when active slide is a video
  useEffect(() => {
    const slide = slides[index];
    if (slide.kind !== "video") return;
    const video = videoRef.current;
    if (!video) return;
    video.load();
    video.play().catch(() => {});
  }, [index, slides]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const slide = slides[index];

  function jumpTo(i: number) {
    clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => { setIndex(i); setVisible(true); }, 400);
  }

  return (
    <div className="promo-reel">
      {slide.kind === "video" ? (
        <video
          ref={videoRef}
          key={slide.src}
          className={`promo-reel-video${visible ? "" : " promo-reel-fading"}`}
          muted
          playsInline
          autoPlay
          onEnded={advance}
        >
          <source src={slide.src} type="video/mp4" />
          <source src={slide.fallback} type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.id}
          src={slide.photoUrl}
          alt={slide.caption ?? `${slide.displayName} photo`}
          className={`promo-reel-video promo-reel-photo${visible ? "" : " promo-reel-fading"}`}
        />
      )}

      <div className={`promo-reel-overlay${visible ? "" : " promo-reel-fading"}`}>
        <p className="promo-reel-brand">Kynfowk</p>
        {slide.kind === "video" ? (
          <p className="promo-reel-headline">
            {slide.headline.split("\n").map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </p>
        ) : (
          <>
            <p className="promo-reel-headline">{slide.displayName}</p>
            {slide.caption && <p className="promo-reel-sub">{slide.caption}</p>}
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="promo-reel-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`promo-reel-dot${i === index ? " promo-reel-dot-active" : ""}`}
              onClick={() => jumpTo(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
