import { NextResponse } from "next/server";

import { getPostAuthRedirectPath } from "@/lib/invites";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    if (type === "recovery") {
      return NextResponse.redirect(new URL("/auth/reset-password", requestUrl.origin));
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const redirectPath = await getPostAuthRedirectPath(user);
      return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/sign-in", requestUrl.origin));
}
