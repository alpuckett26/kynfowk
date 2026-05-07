import { bootLog } from "@/lib/boot-log";

bootLog("120 lib/photos.ts — about to import expo-image-picker");

import * as ImagePicker from "expo-image-picker";

bootLog("121 lib/photos.ts — expo-image-picker imported");

import { decode as decodeBase64 } from "base64-arraybuffer";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { PhotosResponse } from "@/types/api";

const STORAGE_BUCKET = "member-avatars";

export function fetchPhotos(): Promise<PhotosResponse> {
  return apiFetch<PhotosResponse>("/api/native/photos");
}

export async function pickAndUploadPhoto(
  membershipId: string,
  caption: string
): Promise<{ success: true; photoId: string } | { success: false; reason: string }> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { success: false, reason: "Camera roll permission denied." };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    base64: true,
  });

  if (result.canceled || !result.assets?.length) {
    return { success: false, reason: "Cancelled" };
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    return { success: false, reason: "Couldn't read photo data." };
  }

  const ext = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
  const contentType =
    asset.mimeType ?? (ext === "png" ? "image/png" : "image/jpeg");
  const path = `carousel/${membershipId}-${Date.now()}.${ext}`;
  const buffer = decodeBase64(asset.base64);

  const upload = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { upsert: false, contentType });
  if (upload.error) {
    return { success: false, reason: upload.error.message };
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  const res = await apiFetch<{ success: true; photoId: string }>(
    "/api/native/photos",
    {
      method: "POST",
      body: { photoUrl: publicUrlData.publicUrl, caption },
    }
  );
  return res;
}

export function removePhoto(id: string): Promise<{ success: true }> {
  return apiFetch(`/api/native/photos/${id}/remove`, { method: "POST" });
}

export async function pickAndUploadAvatar(
  membershipId: string
): Promise<
  | { success: true; photoUrl: string }
  | { success: false; reason: string }
> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return { success: false, reason: "Camera roll permission denied." };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    base64: true,
    allowsEditing: true,
    aspect: [1, 1],
  });

  if (result.canceled || !result.assets?.length) {
    return { success: false, reason: "Cancelled" };
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    return { success: false, reason: "Couldn't read photo data." };
  }

  const ext = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
  const contentType =
    asset.mimeType ?? (ext === "png" ? "image/png" : "image/jpeg");
  const path = `avatars/${membershipId}-${Date.now()}.${ext}`;
  const buffer = decodeBase64(asset.base64);

  const upload = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { upsert: false, contentType });
  if (upload.error) {
    return { success: false, reason: upload.error.message };
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(path);

  await apiFetch("/api/native/family/avatar", {
    method: "POST",
    body: {
      membershipId,
      photoUrl: publicUrlData.publicUrl,
    },
  });

  return { success: true, photoUrl: publicUrlData.publicUrl };
}
