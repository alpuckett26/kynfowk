import { NextResponse } from "next/server";

import { getPostAuthRedirectPath } from "@/lib/invites";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");

  // Recovery (M40) — Supabase's generateLink({ type: 'recovery' })
  // redirects here with #access_token=... in the URL fragment (implicit
  // grant), not ?code=... in query params. Browsers carry the fragment
  // through redirects, so just bounce to /auth/reset-password where a
  // client component reads the hash and calls supabase.auth.setSession
  // before showing the form.
  if (type === "recovery") {
    return NextResponse.redirect(
      new URL("/auth/reset-password", requestUrl.origin)
    );
  }

  // Invite claim (M41) — the /auth/accept-invite client handler
  // already installed the session via supabase.auth.setSession (the
  // SSR adapter wrote the auth cookies). We just need to claim any
  // pending family_membership and redirect.
  if (type === "invite_claim") {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const redirectPath = await getPostAuthRedirectPath(user);
      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
    }
    return NextResponse.redirect(new URL("/auth/sign-in", requestUrl.origin));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const redirectPath = await getPostAuthRedirectPath(user);
      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/sign-in", requestUrl.origin));
}
