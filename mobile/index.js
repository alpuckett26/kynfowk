const defaultHandler =
  global.ErrorUtils?.getGlobalHandler?.() ?? null;

global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
  if (isFatal) {
    setTimeout(() => {
      const { Alert } = require("react-native");
      Alert.alert(
        "Crash",
        (error?.name ?? "Error") +
          ": " +
          (error?.message ?? "unknown") +
          "\n\n" +
          (error?.stack?.slice(0, 800) ?? ""),
        [{ text: "OK" }]
      );
    }, 0);
    return;
  }
  defaultHandler?.(error, isFatal);
});

require("expo-router/entry");
