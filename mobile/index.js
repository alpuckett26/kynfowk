const defaultHandler =
  global.ErrorUtils?.getGlobalHandler?.() ?? null;

global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  const tag = isFatal ? "[FATAL]" : "[JS ERROR]";
  const msg =
    (error?.name ?? "Error") +
    ": " +
    (error?.message ?? "unknown") +
    "\n" +
    (error?.stack?.slice(0, 600) ?? "no stack");

  // Always log — visible in Xcode console regardless of arch.
  try { console.error(tag, msg); } catch (_) {}

  if (isFatal) {
    // DO NOT call defaultHandler for fatal errors.
    // Old-arch defaultHandler = RCTFatal → throws NSException → SIGABRT.
    // Instead show an Alert so the error is readable on-device.
    // Wrapped in try/catch in case Alert itself fails on this iOS version.
    try {
      const { Alert } = require("react-native");
      Alert.alert("JS Fatal Error", msg, [{ text: "OK" }]);
    } catch (_) {}
    // Return without crashing — app stays open so we can read the message.
    return;
  }

  defaultHandler?.(error, isFatal);
});

require("expo-router/entry");
