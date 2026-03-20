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

        {user && (
          <Link className="header-tree-link" href="/family/tree" aria-label="View family tree">
            {/* Full oak-tree silhouette */}
            <svg viewBox="0 0 56 72" width="38" height="49" fill="currentColor" aria-hidden>
              {/* Canopy — overlapping rounded lobes */}
              <circle cx="28" cy="22" r="20" />
              <circle cx="11" cy="32" r="15" />
              <circle cx="45" cy="32" r="15" />
              <circle cx="28" cy="10" r="13" />
              <circle cx="18" cy="14" r="11" />
              <circle cx="38" cy="14" r="11" />
              {/* Trunk */}
              <path d="M23 46 Q22 52 20 72 L36 72 Q34 52 33 46 Z" />
            </svg>
          </Link>
        )}

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
