"use client";

import { useRef, useState } from "react";

import { addCarouselPhotoAction, removeCarouselPhotoAction } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const MAX_VIDEO_SECONDS = 10;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;  // 5 MB

const GUIDELINES = [
  "This reel is visible to everyone in your circle — including children and grandparents.",
  "Keep content positive and appropriate for all ages.",
  "No profanity, violence, or adult content.",
  "Videos must be 10 seconds or under.",
  "By uploading you confirm this content is appropriate for your whole family.",
];

type MediaItem = {
  id: string;
  photoUrl: string;
  caption: string | null;
  membershipId: string;
  mediaType: "photo" | "video";
};

export function CarouselPhotoUpload({
  membershipId,
  photos,
}: {
  membershipId: string;
  photos: MediaItem[];
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [guidelinesAcked, setGuidelinesAcked] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File, mediaType: "photo" | "video") {
    setError(null);

    if (mediaType === "photo" && file.size > MAX_PHOTO_BYTES) {
      setError("Photo must be under 5 MB.");
      return;
    }
    if (mediaType === "video" && file.size > MAX_VIDEO_BYTES) {
      setError("Video must be under 50 MB.");
      return;
    }

    // Client-side duration check for videos
    let durationSeconds: number | null = null;
    if (mediaType === "video") {
      durationSeconds = await getVideoDuration(file);
      if (durationSeconds === null) {
        setError("Couldn't read video duration. Please try a different file.");
        return;
      }
      if (durationSeconds > MAX_VIDEO_SECONDS) {
        setError(`Video is ${Math.ceil(durationSeconds)}s — must be ${MAX_VIDEO_SECONDS}s or under.`);
        return;
      }
    }

    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop() ?? (mediaType === "video" ? "mp4" : "jpg");
      const folder = mediaType === "video" ? "carousel-videos" : "carousel";
      const path = `${folder}/${membershipId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("member-avatars")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("member-avatars").getPublicUrl(path);
      await addCarouselPhotoAction(
        data.publicUrl,
        caption.trim() || null,
        mediaType,
        durationSeconds
      );
      setCaption("");
      if (photoInputRef.current) photoInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file, "photo");
  }

  function onVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file, "video");
  }

  const myItems = photos.filter((p) => p.membershipId === membershipId);

  return (
    <div className="carousel-upload-shell stack-sm">
      {!guidelinesAcked ? (
        <div className="reel-guidelines">
          <p className="reel-guidelines-title">Family Reel guidelines</p>
          <ul className="reel-guidelines-list">
            {GUIDELINES.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
          <button
            className="button button-primary"
            type="button"
            onClick={() => setGuidelinesAcked(true)}
          >
            I understand — start uploading
          </button>
        </div>
      ) : (
        <>
          <p className="meta">
            Add a photo or short video (≤{MAX_VIDEO_SECONDS}s) to the family reel.
          </p>

          <div className="carousel-upload-form">
            <input
              placeholder="Caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="carousel-caption-input"
            />
            <div className="carousel-upload-btns">
              <button
                className="button button-secondary"
                disabled={uploading}
                onClick={() => photoInputRef.current?.click()}
                type="button"
              >
                {uploading ? "Uploading…" : "Add photo →"}
              </button>
              <button
                className="button button-secondary"
                disabled={uploading}
                onClick={() => videoInputRef.current?.click()}
                type="button"
              >
                {uploading ? "Uploading…" : "Add video (≤10s) →"}
              </button>
            </div>
            <input
              accept="image/*"
              className="avatar-upload-input"
              onChange={onPhotoChange}
              ref={photoInputRef}
              type="file"
            />
            <input
              accept="video/*"
              className="avatar-upload-input"
              onChange={onVideoChange}
              ref={videoInputRef}
              type="file"
            />
          </div>

          {error && <p className="form-message">{error}</p>}

          {myItems.length > 0 && (
            <div className="carousel-my-photos">
              <p className="microcopy">Your items in the reel:</p>
              <div className="carousel-thumb-row">
                {myItems.map((item) => (
                  <div key={item.id} className="carousel-thumb">
                    {item.mediaType === "video" ? (
                      <video
                        src={item.photoUrl}
                        className="carousel-thumb-video"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.photoUrl} alt={item.caption ?? "Family photo"} />
                    )}
                    {item.mediaType === "video" && (
                      <span className="carousel-thumb-badge">Video</span>
                    )}
                    {item.caption && (
                      <span className="carousel-thumb-caption">{item.caption}</span>
                    )}
                    <button
                      className="carousel-thumb-remove"
                      onClick={() => removeCarouselPhotoAction(item.id)}
                      title="Remove from reel"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function getVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(video.duration) ? video.duration : null);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    video.src = url;
  });
}
