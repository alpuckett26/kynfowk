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
type PhotoSlide = { kind: "photo"; id: string; photoUrl: string; caption: string | null; displayName: string; mediaType: "photo" | "video" };
type Slide = VideoSlide | PhotoSlide;

function buildSlides(
  photos: Array<{ id: string; photoUrl: string; caption: string | null; displayName: string; mediaType?: "photo" | "video" }>
): Slide[] {
  const photoSlides: PhotoSlide[] = photos.map((p) => ({ kind: "photo", mediaType: "photo", ...p }));
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
  photos?: Array<{ id: string; photoUrl: string; caption: string | null; displayName: string; mediaType?: "photo" | "video" }>;
}

export function PromoReel({ photos = [] }: PromoReelProps) {
  const slides = buildSlides(photos);
  const [index, setIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const photoTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % slides.length);
  }, [slides.length]);

  // When active index changes: play the active video, pause all others
  useEffect(() => {
    slides.forEach((slide, i) => {
      const el = videoRefs.current[i];
      if (!el) return;
      const isVideoSlide = slide.kind === "video" || (slide.kind === "photo" && slide.mediaType === "video");
      if (!isVideoSlide) return;
      if (i === index) {
        el.currentTime = 0;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    });
  }, [index, slides]);

  // Auto-advance static photo slides after 5s (video slides self-advance via onEnded)
  useEffect(() => {
    const slide = slides[index];
    if (!slide) return;
    const isStaticPhoto = slide.kind === "photo" && slide.mediaType !== "video";
    if (!isStaticPhoto) return;
    photoTimerRef.current = setTimeout(advance, 5000);
    return () => clearTimeout(photoTimerRef.current);
  }, [index, slides, advance]);

  useEffect(() => () => clearTimeout(photoTimerRef.current), []);

  return (
    <div className="promo-reel">
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.kind === "video" ? slide.src : slide.id}
            className={`promo-slide${active ? " promo-slide-active" : ""}`}
          >
            {slide.kind === "video" ? (
              <video
                ref={(el) => { videoRefs.current[i] = el; }}
                className="promo-slide-media"
                muted
                playsInline
                onEnded={active ? advance : undefined}
              >
                <source src={slide.src} type="video/mp4" />
                <source src={slide.fallback} type="video/mp4" />
              </video>
            ) : slide.mediaType === "video" ? (
              <video
                ref={(el) => { videoRefs.current[i] = el; }}
                src={slide.photoUrl}
                className="promo-slide-media"
                muted
                playsInline
                onEnded={active ? advance : undefined}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.photoUrl}
                alt={slide.caption ?? `${slide.displayName} photo`}
                className="promo-slide-media"
              />
            )}

            <div className="promo-slide-overlay">
              <p className="promo-reel-brand">Kynfowk</p>
              {slide.kind === "video" ? (
                <p className="promo-reel-headline">
                  {slide.headline.split("\n").map((line, j, arr) => (
                    <span key={j}>{line}{j < arr.length - 1 && <br />}</span>
                  ))}
                </p>
              ) : (
                <>
                  <p className="promo-reel-headline">{slide.displayName}</p>
                  {slide.caption && <p className="promo-reel-sub">{slide.caption}</p>}
                </>
              )}
            </div>
          </div>
        );
      })}

      {slides.length > 1 && (
        <div className="promo-reel-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`promo-reel-dot${i === index ? " promo-reel-dot-active" : ""}`}
              onClick={() => { clearTimeout(photoTimerRef.current); setIndex(i); }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
