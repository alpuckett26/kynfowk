import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy mobile/.env.example to mobile/.env.local and fill in the values from your Supabase project."
  );
}

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
