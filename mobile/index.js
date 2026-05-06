const defaultHandler =
  global.ErrorUtils?.getGlobalHandler?.() ?? null;

global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  // Log to console so it appears in Xcode / logcat — safe on all iOS versions.
  // Do NOT call Alert.alert here: on iOS 26 the Alert TurboModule
  // (RCTAlertManager.alertWithArgs) throws an ObjC exception because
  // UIApplication.keyWindow was removed, which causes a SIGABRT before
  // the alert ever displays.
  const tag = isFatal ? "[FATAL]" : "[JS ERROR]";
  const msg =
    (error?.name ?? "Error") +
    ": " +
    (error?.message ?? "unknown") +
    "\n" +
    (error?.stack?.slice(0, 800) ?? "no stack");
  console.error(tag, msg);

  // For fatal errors let the default handler run — in production it logs
  // to the system and allows a clean process exit without a TurboModule
  // abort cascade.
  if (isFatal) {
    defaultHandler?.(error, isFatal);
    return;
  }
  defaultHandler?.(error, isFatal);
});

require("expo-router/entry");
