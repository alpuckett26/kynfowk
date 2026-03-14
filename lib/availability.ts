import { DAYS } from "@/lib/constants";

export interface AvailabilityWindowLike {
  weekday: number;
  start_hour: number;
  end_hour: number;
}

export function getAvailabilitySlotKey(window: AvailabilityWindowLike) {
  return `${window.weekday}|${window.start_hour}|${window.end_hour}`;
}

export function sortAvailabilityWindows<T extends AvailabilityWindowLike>(windows: T[]) {
  return windows.slice().sort((left, right) => {
    if (left.weekday !== right.weekday) {
      return left.weekday - right.weekday;
    }

    return left.start_hour - right.start_hour;
  });
}

export function formatAvailabilityTimeRange(startHour: number, endHour: number) {
  return `${formatHour(startHour)}-${formatHour(endHour)}`;
}

export function buildAvailabilitySummary(windows: AvailabilityWindowLike[]) {
  const grouped = new Map<number, string[]>();

  for (const window of sortAvailabilityWindows(windows)) {
    if (!grouped.has(window.weekday)) {
      grouped.set(window.weekday, []);
    }

    grouped
      .get(window.weekday)
      ?.push(formatAvailabilityTimeRange(window.start_hour, window.end_hour));
  }

  return [...grouped.entries()].map(([weekday, ranges]) => ({
    weekday,
    dayLabel: DAYS[weekday]?.label ?? "Day",
    label: `${DAYS[weekday]?.label ?? "Day"}: ${ranges.join(", ")}`
  }));
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}${suffix}`;
}
