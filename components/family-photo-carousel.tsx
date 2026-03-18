"use client";

import { useEffect, useRef, useState } from "react";

export function FamilyPhotoCarousel({
  photos
}: {
  photos: Array<{ id: string; photoUrl: string; caption: string | null; displayName: string }>;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (paused || photos.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % photos.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [paused, photos.length]);

  if (photos.length === 0) return null;

  const current = photos[index];

  return (
    <div
      className="carousel-shell"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="carousel-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.id}
          src={current.photoUrl}
          alt={current.caption ?? `${current.displayName} photo`}
          className="carousel-photo"
        />
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
