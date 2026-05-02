"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/app/actions";

interface HeaderKebabMenuProps {
  showAdmin: boolean;
}

/**
 * M50 — single overflow menu in the site header that holds Settings,
 * Edit Family Circle, Phonebook, Admin (conditional), and Sign out.
 * Replaces the row of six small links the header used to render so
 * the chrome only shows brand + tree + Invite Fam + this kebab.
 */
export function HeaderKebabMenu({ showAdmin }: HeaderKebabMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className="kebab-wrap" ref={wrapRef}>
      <button
        type="button"
        className="kebab-button"
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open ? (
        <div className="kebab-menu" role="menu">
          <Link href="/notifications" role="menuitem" onClick={() => setOpen(false)}>
            Updates
          </Link>
          <Link href="/settings" role="menuitem" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <Link href="/onboarding" role="menuitem" onClick={() => setOpen(false)}>
            Edit Family Circle
          </Link>
          <Link href="/phonebook" role="menuitem" onClick={() => setOpen(false)}>
            Phonebook
          </Link>
          {showAdmin ? (
            <Link href="/admin" role="menuitem" onClick={() => setOpen(false)}>
              Admin
            </Link>
          ) : null}
          <form action={signOutAction}>
            <button type="submit" role="menuitem">
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
