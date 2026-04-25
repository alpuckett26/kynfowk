import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  id?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  id,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-600">
          {eyebrow}
        </p>
      )}
      <h2
        id={id}
        className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg leading-relaxed text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}
