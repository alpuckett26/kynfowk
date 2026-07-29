import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import Script from "next/script";

import "@/app/globals.css";

import { ChatWidget } from "@/components/chat-widget";
import { Chyron } from "@/components/chyron";
import { IncomingCallWatcher } from "@/components/incoming-call-watcher";
import { InstallPrompt } from "@/components/install-prompt";
import { PageTransition } from "@/components/page-transition";
import { PresenceTracker } from "@/components/presence-tracker";
import { PwaBootstrap } from "@/components/pwa-bootstrap";
import { SiteHeader } from "@/components/site-header";
import { getAdSenseClientId, getAdSenseScriptSrc } from "@/lib/ads";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

export const metadata: Metadata = {
  // metadataBase makes every relative OG/twitter URL absolute. Without it Next
  // emits relative image paths, which crawlers and link unfurlers ignore — so
  // the generated opengraph-image would never actually show up.
  metadataBase: new URL("https://kynfowk.com"),
  title: "Kynfowk",
  description:
    "A warm family coordination app for shared availability, call scheduling, and Time Together.",
  openGraph: {
    type: "website",
    siteName: "Kynfowk",
    url: "https://kynfowk.com",
    title: "Kynfowk — family coordination that actually fits a family",
    description:
      "Shared availability, call scheduling, and Time Together — so staying close doesn't take a group chat.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kynfowk — family coordination that actually fits a family",
    description:
      "Shared availability, call scheduling, and Time Together — so staying close doesn't take a group chat.",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kynfowk",
    statusBarStyle: "default"
  }
};

export const viewport = {
  themeColor: "#c7663f",
  // viewport-fit=cover lets content extend behind the notch/home indicator;
  // safe-area CSS vars then push content back into the safe zone.
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // M54 — load AdSense once per visit when the publisher ID is set on
  // Vercel. Without the env var, no script is emitted and every AdSlot
  // falls back to the placeholder.
  const adSenseClientId = getAdSenseClientId();

  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${manrope.variable}`}>
        {adSenseClientId ? (
          <Script
            id="adsbygoogle-init"
            src={getAdSenseScriptSrc(adSenseClientId)}
            strategy="afterInteractive"
            crossOrigin="anonymous"
            async
          />
        ) : null}
        <PwaBootstrap />
        <PresenceTracker />
        <PageTransition />
        <SiteHeader />
        <Chyron />
        {children}
        <ChatWidget />
        <InstallPrompt />
        <IncomingCallWatcher />
      </body>
    </html>
  );
}
