// M91 — boot-log breadcrumbs run BEFORE expo-router/entry imports
// so we capture the last successful step if a module's import-time
// or native init throws. The bootLog helper persists each entry to
// AsyncStorage; _layout.tsx surfaces them on the next launch.
const { bootLog } = require("./lib/boot-log");

bootLog("01 index.js entered");

const defaultHandler =
  global.ErrorUtils?.getGlobalHandler?.() ?? null;

global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  const msg =
    (error?.name ?? "Error") +
    ": " +
    (error?.message ?? "unknown") +
    "\n" +
    (error?.stack?.slice(0, 800) ?? "no stack");

  // Persist to AsyncStorage so the NEXT launch can display it.
  // Fire-and-forget — we race against the native abort but on iPhone 16
  // the SQLite write often completes before the process dies.
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    AsyncStorage.setItem("@kf:startup_crash", msg).catch(() => {});
  } catch (_) {}

  bootLog("FATAL_JS " + (error?.message ?? "unknown"));

  if (isFatal) {
    // Do NOT call defaultHandler (= RCTFatal → NSException → abort).
    return;
  }
  defaultHandler?.(error, isFatal);
});

bootLog("02 error handler installed");

require("expo-router/entry");

bootLog("03 expo-router/entry required");
