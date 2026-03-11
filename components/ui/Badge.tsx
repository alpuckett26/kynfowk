import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "warm" | "success" | "outline";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-brand-100 text-brand-800": variant === "default",
          "bg-warm-100 text-warm-800": variant === "warm",
          "bg-green-100 text-green-800": variant === "success",
          "border border-gray-200 text-gray-600": variant === "outline",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
