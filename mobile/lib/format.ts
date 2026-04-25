const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

const fullFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return fullFmt.format(new Date(iso));
}

export function formatDateTimeRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    return `${dateFmt.format(start)} · ${timeFmt.format(start)} – ${timeFmt.format(end)}`;
  }
  return `${fullFmt.format(start)} → ${fullFmt.format(end)}`;
}

export function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = then - now;
  const absMin = Math.abs(diffMs) / 60_000;
  if (absMin < 1) return diffMs >= 0 ? "in moments" : "just now";
  if (absMin < 60) {
    const m = Math.round(absMin);
    return diffMs >= 0 ? `in ${m}m` : `${m}m ago`;
  }
  const absHr = absMin / 60;
  if (absHr < 24) {
    const h = Math.round(absHr);
    return diffMs >= 0 ? `in ${h}h` : `${h}h ago`;
  }
  const absDay = absHr / 24;
  if (absDay < 14) {
    const d = Math.round(absDay);
    return diffMs >= 0 ? `in ${d}d` : `${d}d ago`;
  }
  return formatDate(iso);
}
