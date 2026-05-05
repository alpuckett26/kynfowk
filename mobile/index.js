// Catch ALL JS errors (fatal and non-fatal) before expo-router loads
const defaultHandler = global.ErrorUtils?.getGlobalHandler?.();
global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  const { Alert } = require("react-native");
  const msg =
    (error?.name ?? "Error") +
    ": " +
    (error?.message ?? "unknown") +
    "\n\n" +
    (error?.stack?.slice(0, 600) ?? "no stack");
  // Synchronous alert — no setTimeout so it fires before process exits
  Alert.alert(isFatal ? "Fatal Crash" : "JS Error", msg, [{ text: "OK" }]);
  if (!isFatal) defaultHandler?.(error, isFatal);
});

require("expo-router/entry");
