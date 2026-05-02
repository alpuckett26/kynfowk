import Link from "next/link";

import { HeaderKebabMenu } from "@/components/header-kebab-menu";
import { InviteFamButton } from "@/components/invite-fam-button";
import { NAV_LINKS } from "@/lib/constants";
import { getViewer } from "@/lib/data";
import { isAdminEmail } from "@/lib/env";

export async function SiteHeader() {
  const user = await getViewer();
  const showAdmin = !!(user?.email && isAdminEmail(user.email));

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href={user ? "/dashboard" : "/"}>
          Kynfowk
        </Link>

        {user ? (
          <Link className="header-tree-link" href="/family/tree" aria-label="View family tree">
            <svg viewBox="0 0 56 72" width="34" height="44" fill="currentColor" aria-hidden>
              <circle cx="28" cy="22" r="20" />
              <circle cx="11" cy="32" r="15" />
              <circle cx="45" cy="32" r="15" />
              <circle cx="28" cy="10" r="13" />
              <circle cx="18" cy="14" r="11" />
              <circle cx="38" cy="14" r="11" />
              <path d="M23 46 Q22 52 20 72 L36 72 Q34 52 33 46 Z" />
            </svg>
          </Link>
        ) : null}

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
              <HeaderKebabMenu showAdmin={showAdmin} />
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
