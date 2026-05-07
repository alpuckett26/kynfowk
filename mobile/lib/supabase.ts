import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { bootLog } from "@/lib/boot-log";

bootLog("10 supabase.ts module loaded");

const url = "https://xkufjotjcgptcoybyimb.supabase.co";
const anonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrdWZqb3RqY2dwdGNveWJ5aW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNjQ3OTQsImV4cCI6MjA4ODk0MDc5NH0.haHwDjW3yuixjGjhTt5SlL8Kx07mF8HEj4npcxMmEQc";

bootLog("11 supabase createClient about to run");

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Native apps must use PKCE flow. Without this, signInWithOtp returns
    // a magic link that lands at the callback with #access_token in the
    // URL hash — which expo-router/useLocalSearchParams cannot read on
    // native, and the session never gets established. PKCE flow returns
    // ?code= in the query string which we exchange for a session in
    // app/auth/callback.tsx.
    flowType: "pkce",
  },
});

bootLog("12 supabase createClient returned");
