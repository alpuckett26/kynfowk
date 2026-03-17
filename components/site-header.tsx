import Link from "next/link";

import { signOutAction } from "@/app/actions";
import { Button } from "@/components/button";
import { InviteFamButton } from "@/components/invite-fam-button";
import { NAV_LINKS } from "@/lib/constants";
import { getViewer } from "@/lib/data";
import { isAdminEmail } from "@/lib/env";

export async function SiteHeader() {
  const user = await getViewer();

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/">
          Kynfowk
        </Link>

        <nav className="nav">
          {NAV_LINKS.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <InviteFamButton />
              {isAdminEmail(user.email) ? <a href="/admin">Admin</a> : null}
              <a href="/family">Family</a>
              <a href="/settings">Settings</a>
              <a href="/onboarding">Update Family Circle</a>
              <form action={signOutAction}>
                <Button type="submit" variant="secondary">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/sign-in">Sign in</Link>
              <Link className="button" href="/auth/sign-up">
                Start free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
