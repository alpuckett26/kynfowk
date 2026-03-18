"use client";

import { useRef, useState } from "react";

import { addCarouselPhotoAction, removeCarouselPhotoAction } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function CarouselPhotoUpload({
  membershipId,
  photos
}: {
  membershipId: string;
  photos: Array<{ id: string; photoUrl: string; caption: string | null; membershipId: string }>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Photo must be under 5 MB."); return; }

    setError(null);
    setUploading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `carousel/${membershipId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("member-avatars")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("member-avatars").getPublicUrl(path);
      await addCarouselPhotoAction(data.publicUrl, caption.trim() || null);
      setCaption("");
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  const myPhotos = photos.filter((p) => p.membershipId === membershipId);

  return (
    <div className="carousel-upload-shell stack-sm">
      <p className="meta">
        Add a photo to the family reel — it will appear in the home screen carousel.
      </p>

      <div className="carousel-upload-form">
        <input
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="carousel-caption-input"
        />
        <button
          className="button button-secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {uploading ? "Uploading…" : "Choose photo →"}
        </button>
        <input
          accept="image/*"
          className="avatar-upload-input"
          onChange={handleUpload}
          ref={inputRef}
          type="file"
        />
      </div>

      {error && <p className="form-message">{error}</p>}

      {myPhotos.length > 0 && (
        <div className="carousel-my-photos">
          <p className="microcopy">Your photos in the reel:</p>
          <div className="carousel-thumb-row">
            {myPhotos.map((photo) => (
              <div key={photo.id} className="carousel-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.photoUrl} alt={photo.caption ?? "Family photo"} />
                {photo.caption && <span className="carousel-thumb-caption">{photo.caption}</span>}
                <button
                  className="carousel-thumb-remove"
                  onClick={() => removeCarouselPhotoAction(photo.id)}
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
    </div>
  );
}
