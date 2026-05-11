/**
 * Global jest setup — runs before every test file.
 *
 * Mocks expo-router's `router` global so navigation calls don't error
 * out under jest-expo's RN environment, and silences expo-notifications
 * warnings about missing native handlers.
 */

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
  Stack: { Screen: () => null },
}));

jest.mock("expo-notifications", () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: "ExponentPushToken[TEST]" }),
  ),
  getPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", canAskAgain: true, granted: true }),
  ),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: "granted", granted: true, canAskAgain: true }),
  ),
  setNotificationHandler: jest.fn(),
  AndroidImportance: { MAX: 5, HIGH: 4 },
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
}));

// Quiet jest's "RCTBridge: NativeModule…" warnings; they're noise here.
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("NativeModule")) return;
  originalWarn(...args);
};
