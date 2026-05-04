const defaultHandler =
  global.ErrorUtils?.getGlobalHandler?.() ?? null;

global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  if (isFatal) {
    setTimeout(() => {
      const { Alert } = require("react-native");
      Alert.alert(
        "M74 Startup Error",
        (error?.name ?? "Error") +
          ": " +
          (error?.message ?? "unknown") +
          "\n\n" +
          (error?.stack?.slice(0, 600) ?? ""),
        [{ text: "OK" }]
      );
    }, 0);
    // Do NOT call defaultHandler — prevents SIGABRT so we can read the message
    return;
  }
  defaultHandler?.(error, isFatal);
});

require("expo-router/entry");
