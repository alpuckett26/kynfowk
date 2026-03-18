import type { Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getPostAuthRedirectPath } from "@/lib/invites";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AcceptInvitePage({
  searchParams
}: {
  searchParams?: Promise<{
    code?: string;
    circle?: string;
    from?: string;
    email?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};

  // If Supabase redirected here with a code, exchange it and claim the invite
  if (params.code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(params.code);
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const redirectPath = await getPostAuthRedirectPath(user);
      redirect(redirectPath);
    }

    redirect("/auth/sign-in");
  }

  // No code yet — show the welcoming landing page
  const circleName = params.circle ?? "a Family Circle";
  const inviterName = params.from;
  const inviteEmail = params.email;

  const signUpHref = (
    inviteEmail
      ? `/auth/sign-up?email=${encodeURIComponent(inviteEmail)}`
      : "/auth/sign-up"
  ) as Route;

  return (
    <main className="page-shell">
      <div className="container">
        <div className="accept-invite-shell">
          <div className="accept-invite-card">
            <span className="eyebrow">You&apos;re invited</span>

            <h1 className="accept-invite-headline">
              Join{" "}
              <em className="accept-invite-accent">{circleName}</em>
              {" "}on Kynfowk
            </h1>

            {inviterName ? (
              <p className="accept-invite-lede">
                <strong>{inviterName}</strong> added you to their Family Circle
                and wants to stay connected. Kynfowk helps families share real
                availability, schedule calls that actually happen, and build a
                streak of Time Together.
              </p>
            ) : (
              <p className="accept-invite-lede">
                Someone added you to a Family Circle and wants to stay
                connected. Kynfowk helps families find the best time to talk
                and keep that rhythm going.
              </p>
            )}

            {inviteEmail ? (
              <p className="accept-invite-email-note">
                Your invite was sent to <strong>{inviteEmail}</strong>. Use
                that address when creating your account.
              </p>
            ) : null}

            <div className="accept-invite-actions">
              <Link className="button accept-invite-primary" href={signUpHref}>
                Accept invite &amp; create account
              </Link>
              <Link className="button button-secondary" href="/auth/sign-in">
                I already have an account
              </Link>
            </div>

            <p className="microcopy">
              Free forever for families. No credit card needed.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
