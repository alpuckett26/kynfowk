const defaultHandler = global.ErrorUtils?.getGlobalHandler?.();
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

  if (isFatal) {
    // Do NOT call defaultHandler (= RCTFatal → NSException → abort).
    return;
  }
  defaultHandler?.(error, isFatal);
});

require("expo-router/entry");
