import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import "@/app/globals.css";

import { InstallPrompt } from "@/components/install-prompt";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PwaBootstrap } from "@/components/pwa-bootstrap";
import { SiteHeader } from "@/components/site-header";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  title: "Kynfowk",
  description:
    "A warm family coordination app for shared availability, call scheduling, and Time Together.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kynfowk",
    statusBarStyle: "default"
  }
};

export const viewport = {
  themeColor: "#c7663f"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${manrope.variable}`}>
        <PwaBootstrap />
        <SiteHeader />
        {children}
        <MobileBottomNav />
        <InstallPrompt />
      </body>
    </html>
  );
}
