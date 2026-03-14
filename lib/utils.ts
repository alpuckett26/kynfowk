import { clsx, type ClassValue } from "clsx";

import type { CallStatus, ReminderStatus } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDateTime(value: string, timeZone?: string) {
  return formatDateTimeInTimezone(value, timeZone);
}

export function formatDateTimeInTimezone(value: string, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDateTimeRange(start: string, end: string, timeZone?: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  return `${new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(startDate)} to ${new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit"
  }).format(endDate)}`;
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0")
  };
}

export function formatDateTimeInputValue(value: string, timeZone: string) {
  const parts = getTimeZoneParts(new Date(value), timeZone);

  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function convertLocalDateTimeToUtc(localValue: string, timeZone: string) {
  const match = localValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const target = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5])
  };

  let guess = new Date(
    Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute)
  );

  for (let index = 0; index < 3; index += 1) {
    const actual = getTimeZoneParts(guess, timeZone);
    const desiredUtc = Date.UTC(
      target.year,
      target.month - 1,
      target.day,
      target.hour,
      target.minute
    );
    const actualUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute
    );
    const diff = desiredUtc - actualUtc;

    if (diff === 0) {
      break;
    }

    guess = new Date(guess.getTime() + diff);
  }

  return guess.toISOString();
}

export function isFutureCall(startAt: string) {
  return new Date(startAt).getTime() > Date.now();
}

export function formatTimezoneLabel(timeZone: string) {
  return timeZone.replace(/_/g, " ");
}

export function describeQuietHours(
  quietHoursStart: number | null,
  quietHoursEnd: number | null
) {
  if (quietHoursStart === null || quietHoursEnd === null) {
    return "Quiet hours are off right now.";
  }

  if (quietHoursStart === quietHoursEnd) {
    return "Matching start and end hours mean quiet hours are off.";
  }

  const formatHour = (hour: number) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric"
    }).format(new Date(Date.UTC(2024, 0, 1, hour, 0)));

  return `${formatHour(quietHoursStart)} to ${formatHour(quietHoursEnd)}. Kynfowk treats the end hour as the first hour back on.`;
}

export function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function getWeekKey(date: Date) {
  const firstDay = startOfWeek(date);
  return firstDay.toISOString().slice(0, 10);
}

export function normalizeMeetingUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const candidate = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(candidate);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function inferMeetingProvider(url: string) {
  const host = new URL(url).hostname.toLowerCase();

  if (host.includes("zoom")) {
    return "Zoom";
  }

  if (host.includes("meet.google")) {
    return "Google Meet";
  }

  if (host.includes("teams")) {
    return "Microsoft Teams";
  }

  if (host.includes("facetime")) {
    return "FaceTime";
  }

  return "Shared link";
}

export function isReminderNotNeeded(status: CallStatus) {
  return status === "completed" || status === "canceled";
}

export function normalizeReminderStatus(
  status: CallStatus,
  reminderStatus: ReminderStatus | null | undefined
): ReminderStatus {
  if (isReminderNotNeeded(status)) {
    return "not_needed";
  }

  return reminderStatus ?? "pending";
}

export function isCallNear(startAt: string, hours = 24) {
  const start = new Date(startAt).getTime();
  const now = Date.now();
  const distance = start - now;

  return distance >= 0 && distance <= hours * 60 * 60 * 1000;
}

export function isCallPastDue(status: CallStatus, endAt: string) {
  if (isReminderNotNeeded(status)) {
    return false;
  }

  return new Date(endAt).getTime() < Date.now();
}

export function buildRecoveryRescheduleWindow(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const durationMs = Math.max(end.getTime() - start.getTime(), 15 * 60 * 1000);

  const nextStart = new Date(start);
  nextStart.setDate(nextStart.getDate() + 7);

  return {
    startAt: nextStart.toISOString(),
    endAt: new Date(nextStart.getTime() + durationMs).toISOString()
  };
}

export function formatReminderState(
  status: CallStatus,
  reminderStatus: ReminderStatus | null | undefined,
  reminderSentAt?: string | null
) {
  const normalizedStatus = normalizeReminderStatus(status, reminderStatus);

  if (normalizedStatus === "sent") {
    return reminderSentAt
      ? `Reminder sent ${formatDateTime(reminderSentAt)}`
      : "Reminder sent to the Family Circle";
  }

  if (normalizedStatus === "not_needed") {
    return "No reminder needed for this call now";
  }

  return "Reminder still pending";
}
