import { apiFetch } from "@/lib/api";
import type {
  AvailabilityResponse,
  SaveAvailabilityResponse,
} from "@/types/api";

export const DAYS = [
  { value: 0, label: "Sun", fullLabel: "Sunday" },
  { value: 1, label: "Mon", fullLabel: "Monday" },
  { value: 2, label: "Tue", fullLabel: "Tuesday" },
  { value: 3, label: "Wed", fullLabel: "Wednesday" },
  { value: 4, label: "Thu", fullLabel: "Thursday" },
  { value: 5, label: "Fri", fullLabel: "Friday" },
  { value: 6, label: "Sat", fullLabel: "Saturday" },
] as const;

export const TIME_BLOCKS = [
  { startHour: 7, endHour: 10, label: "Morning", subtitle: "7–10 AM" },
  { startHour: 11, endHour: 14, label: "Midday", subtitle: "11 AM–2 PM" },
  { startHour: 17, endHour: 20, label: "Evening", subtitle: "5–8 PM" },
  { startHour: 20, endHour: 22, label: "Late evening", subtitle: "8–10 PM" },
] as const;

export function slotKey(weekday: number, startHour: number, endHour: number) {
  return `${weekday}|${startHour}|${endHour}`;
}

export function fetchAvailability(): Promise<AvailabilityResponse> {
  return apiFetch<AvailabilityResponse>("/api/native/availability");
}

export function saveAvailability(slots: string[]): Promise<SaveAvailabilityResponse> {
  return apiFetch("/api/native/availability/save", {
    method: "POST",
    body: { slots },
  });
}
