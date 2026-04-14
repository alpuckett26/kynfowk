import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
}

export function Card({ children, className, as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-6 pt-6 pb-4 border-b border-gray-50", className)}>
      {children}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 py-5", className)}>{children}</div>;
}
