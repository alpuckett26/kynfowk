import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: string;
  className?: string;
  loading?: boolean;
}

export function StatTile({
  label,
  value,
  subtext,
  icon,
  accent = "bg-brand-50",
  className,
  loading = false,
}: StatTileProps) {
  if (loading) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm",
          className
        )}
      >
        <div className="h-8 w-8 rounded-lg bg-gray-100 animate-pulse mb-3" />
        <div className="h-7 w-16 rounded bg-gray-100 animate-pulse mb-2" />
        <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl",
            accent
          )}
        >
          {icon}
        </div>
      )}
      <p className="text-3xl font-bold text-gray-900 tabular-nums animate-count-up">
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-700">{label}</p>
      {subtext && <p className="mt-0.5 text-xs text-gray-400">{subtext}</p>}
    </div>
  );
}
