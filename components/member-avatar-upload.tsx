"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { updateMemberAvatarAction } from "@/app/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function MemberAvatarUpload({
  membershipId,
  currentAvatarUrl,
  displayName
}: {
  membershipId: string;
  currentAvatarUrl: string | null;
  displayName: string;
}) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `avatars/${membershipId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("member-avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("member-avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      await updateMemberAvatarAction(membershipId, publicUrl);
      setAvatarUrl(publicUrl + `?t=${Date.now()}`);
    } catch (err) {
      setError("Upload failed. Please try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="avatar-upload">
      <button
        className="avatar-upload-trigger"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        title="Change photo"
        type="button"
      >
        {avatarUrl ? (
          <Image
            alt={displayName}
            className="avatar-upload-img"
            height={52}
            src={avatarUrl}
            style={{ borderRadius: "50%", objectFit: "cover" }}
            unoptimized
            width={52}
          />
        ) : (
          <div className="avatar-upload-initials">{initials}</div>
        )}
        <span className="avatar-upload-overlay">{uploading ? "…" : "📷"}</span>
      </button>
      <input
        accept="image/*"
        className="avatar-upload-input"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />
      {error && <p className="form-message" style={{ fontSize: "0.8rem" }}>{error}</p>}
    </div>
  );
}
