import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import "@/app/globals.css";

import { ChatWidget } from "@/components/chat-widget";
import { Chyron } from "@/components/chyron";
import { DeepLinkHandler } from "@/components/deep-link-handler";
import { PushNotificationHandler } from "@/components/push-notification-handler";
import { InstallPrompt } from "@/components/install-prompt";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PageTransition } from "@/components/page-transition";
import { PresenceTracker } from "@/components/presence-tracker";
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
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${manrope.variable}`}>
        <PwaBootstrap />
        <DeepLinkHandler />
        <PushNotificationHandler />
        <PresenceTracker />
        <PageTransition />
        <SiteHeader />
        <Chyron />
        {children}
        <MobileBottomNav />
        <ChatWidget />
        <InstallPrompt />
      </body>
    </html>
  );
}
