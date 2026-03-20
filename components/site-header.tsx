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
      {user && (
        <Link className="header-tree-link" href="/family/tree" aria-label="View family tree">
          <svg viewBox="0 0 24 28" width="26" height="30" fill="currentColor" aria-hidden>
            <circle cx="12" cy="9"  r="8" />
            <circle cx="7"  cy="14" r="6" />
            <circle cx="17" cy="14" r="6" />
            <rect   x="10" y="19"  width="4" height="9" rx="1" />
          </svg>
        </Link>
      )}
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
              <div className="header-secondary-actions">
                {isAdminEmail(user.email) ? <a href="/admin">Admin</a> : null}
                <a href="/family">Family</a>
                <a href="/phonebook">Phonebook</a>
                <a href="/settings">Settings</a>
                <a href="/onboarding">Update Circle</a>
                <form action={signOutAction}>
                  <Button type="submit" variant="secondary">
                    Sign out
                  </Button>
                </form>
              </div>
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
