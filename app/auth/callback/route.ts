import { NextResponse } from "next/server";

import { getPostAuthRedirectPath } from "@/lib/invites";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");

  // Recovery (password reset) — Supabase's generateLink({ type: 'recovery' })
  // redirects here with #access_token=... in the URL fragment (implicit
  // grant), not ?code=... in query params. Browsers carry the fragment
  // through redirects, so we just need to bounce to /auth/reset-password
  // where a client component can read window.location.hash and call
  // supabase.auth.setSession before showing the form.
  if (type === "recovery") {
    return NextResponse.redirect(
      new URL("/auth/reset-password", requestUrl.origin)
    );
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
