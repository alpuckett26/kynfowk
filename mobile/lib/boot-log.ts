/**
 * mobile/lib/boot-log.ts
 *
 * Append-only breadcrumb log persisted to AsyncStorage so we can
 * diagnose startup crashes without Xcode / Console.app access. Each
 * breadcrumb writes synchronously to in-memory state immediately and
 * fire-and-forgets the AsyncStorage flush. On the next launch
 * `readAndClearBootLog()` returns the trail of the previous boot,
 * letting `_layout.tsx` show the user the last successful step before
 * the crash.
 *
 * Why not just `console.log`: phone-only debugging means we can't
 * attach Console.app or Xcode. AsyncStorage survives the process
 * abort because writes go through a native SQLite/file path on a
 * background thread; on iPhone 16 the write usually flushes within
 * 5–20 ms which beats the time it takes the abort signal to take
 * down the process for most native-thrown crashes.
 *
 * Cap the log at 200 entries so a runaway breadcrumb caller can't
 * fill device storage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@kf:boot_log";
const MAX_ENTRIES = 200;

let memoryLog: Array<{ t: number; label: string }> = [];
let writeQueued = false;

function flush() {
  if (writeQueued) return;
  writeQueued = true;
  // Defer one tick so successive bootLog() calls coalesce into one
  // AsyncStorage write rather than racing N writes.
  setTimeout(() => {
    writeQueued = false;
    AsyncStorage.setItem(KEY, JSON.stringify(memoryLog)).catch(() => {});
  }, 0);
}

export function bootLog(label: string): void {
  // Prefix with KYNFOWK_BOOT so a Mac-side log filter would catch it.
  // Output to console for any developer attached.
  // eslint-disable-next-line no-console
  console.log("KYNFOWK_BOOT", label);
  if (memoryLog.length >= MAX_ENTRIES) {
    memoryLog.shift();
  }
  memoryLog.push({ t: Date.now(), label });
  flush();
}

/**
 * Read and clear the previous boot's breadcrumb trail. Returns
 * entries in insertion order. Call from `_layout.tsx` once on mount.
 */
export async function readAndClearBootLog(): Promise<
  Array<{ t: number; label: string }>
> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    await AsyncStorage.removeItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<{ t: number; label: string }>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Format a breadcrumb trail for human-readable display in an Alert
 * or on-screen banner.
 */
export function formatBootLog(
  entries: Array<{ t: number; label: string }>
): string {
  if (entries.length === 0) return "(no breadcrumbs)";
  const t0 = entries[0]?.t ?? 0;
  return entries
    .map((e) => `+${(e.t - t0).toString().padStart(4, " ")}ms  ${e.label}`)
    .join("\n");
}
