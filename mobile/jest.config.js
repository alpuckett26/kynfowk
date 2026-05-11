/**
 * Jest config for the Expo (React Native) mobile client.
 *
 * Uses jest-expo's preset, which:
 *   - Configures babel transforms for RN + Expo modules
 *   - Mocks native modules that don't run in Node
 *   - Resolves @/ paths through tsconfig.json
 *
 * Run with `cd mobile && npm test` (after `npm install`).
 */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  testMatch: [
    "<rootDir>/**/__tests__/**/*.test.ts",
    "<rootDir>/**/__tests__/**/*.test.tsx",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))",
  ],
};
