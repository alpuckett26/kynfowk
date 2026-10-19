import { apiFetch } from "@/lib/api";
import type { LocationSharesResponse } from "@/types/api";

export const fetchLocationShares = () => apiFetch<LocationSharesResponse>("/api/native/location");

export const saveLocationShare = (body: {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  durationHours: 1 | 8 | 24;
}) => apiFetch<{ success: true; sharedUntil: string; recipientCount: number }>("/api/native/location", { method: "POST", body });

export const stopLocationShare = () => apiFetch<{ success: true }>("/api/native/location", { method: "DELETE" });
