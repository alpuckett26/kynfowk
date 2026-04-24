"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { ok: boolean; message: string };

/**
 * Server action: send a magic link to `email`.
 * Used by the /login form and the GetStartedForm on the landing page.
 * Successful sign-in lands on /auth/callback which exchanges the code,
 * sets the session cookie, and redirects to /dashboard.
 */
export async function sendMagicLink(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, message: "Email is required." };

  const supabase = createClient();
  const origin =
    headers().get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://kynfowk.com";

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    message: "Check your email — we sent you a magic link.",
  };
}

/**
 * Server action: sign out the current user and bounce to the home page.
 */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
