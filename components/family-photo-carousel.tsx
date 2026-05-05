"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function FamilyPhotoCarousel({
  photos
}: {
  photos: Array<{ id: string; photoUrl: string; caption: string | null; displayName: string; mediaType?: "photo" | "video" }>;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (paused || photos.length <= 1) return;
    const current = photos[index];
    // Videos self-advance via onEnded; only set interval for static photos
    if (current?.mediaType === "video") return;
    timerRef.current = setInterval(advance, 4000);
    return () => clearInterval(timerRef.current);
  }, [paused, photos.length, photos, index, advance]);

  // Play/pause the video element when index changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [index]);

  if (photos.length === 0) return null;

  const current = photos[index];

  return (
    <div
      className="carousel-shell"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="carousel-frame">
        {current.mediaType === "video" ? (
          <video
            key={current.id}
            ref={videoRef}
            src={current.photoUrl}
            className="carousel-photo"
            muted
            playsInline
            onEnded={advance}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={current.photoUrl}
            alt={current.caption ?? `${current.displayName} photo`}
            className="carousel-photo"
          />
        )}
        <div className="carousel-overlay">
          {current.caption && <p className="carousel-caption">{current.caption}</p>}
          <p className="carousel-name">{current.displayName}</p>
        </div>
      </div>

      {photos.length > 1 && (
        <div className="carousel-dots">
          {photos.map((_, i) => (
            <button
              key={i}
              className={`carousel-dot${i === index ? " carousel-dot-active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
