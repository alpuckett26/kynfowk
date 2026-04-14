import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Kynfowk — Keep Your Family Close",
    template: "%s | Kynfowk",
  },
  description:
    "Kynfowk helps families schedule, share, and celebrate every moment together — from weekly check-ins to milestone calls.",
  openGraph: {
    title: "Kynfowk — Keep Your Family Close",
    description:
      "Schedule family calls effortlessly, track connection milestones, and celebrate every moment together.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jakartaSans.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
