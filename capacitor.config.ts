import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId:   "com.kynfowk.app",
  appName: "Kynfowk",
  webDir:  "out",

  // Live server — WebView loads from Vercel so server components,
  // API routes, and Supabase SSR all work without a static export.
  // Remove server block when/if we move to a fully static build.
  server: {
    url: "https://kynfowk.com",
    cleartext: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#F8F4EC",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#F8F4EC",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      // Show banner + badge + sound when the app is in the foreground (iOS).
      // Android always shows a system notification regardless of this setting.
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
