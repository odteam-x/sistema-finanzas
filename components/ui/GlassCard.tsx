import { cn } from "@/lib/cn";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
  as?: "div" | "section" | "article";
}

export function GlassCard({
  strong,
  as: Tag = "div",
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <Tag
      className={cn(
        strong ? "glass-strong" : "glass",
        "rounded-[var(--radius-glass)] p-4 sm:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
