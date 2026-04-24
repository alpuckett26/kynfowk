import Link from "next/link";
import { cn } from "@/lib/utils";

type TopNavProps = {
  /** Container width — wide for marketing pages, narrow for app pages. */
  width?: "wide" | "narrow";
  /** Whether the bg should use backdrop-blur (marketing pages) or be solid (app pages). */
  blur?: boolean;
  /** Right-side content — links, CTAs, badges. Renders inside a flex row with gap-4. */
  children?: React.ReactNode;
};

export function TopNav({
  width = "wide",
  blur = false,
  children,
}: TopNavProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-gray-100",
        blur ? "bg-white/80 backdrop-blur-md" : "bg-white"
      )}
    >
      <nav
        className={cn(
          "mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8",
          width === "wide" ? "max-w-7xl" : "max-w-5xl"
        )}
      >
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="text-xl">💜</span>
          <span>Kynfowk</span>
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium">
          {children}
        </div>
      </nav>
    </header>
  );
}
