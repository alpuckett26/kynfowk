import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Call Summary",
  description:
    "Your family call summary — duration, participants, and the connection score earned.",
};

export default function PostCallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
