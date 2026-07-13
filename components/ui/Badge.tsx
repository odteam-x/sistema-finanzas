import { cn } from "@/lib/cn";

type Tone = "primary" | "neutral" | "danger" | "warning" | "success" | "info";

const tones: Record<Tone, string> = {
  primary: "bg-primary-soft text-primary",
  neutral: "bg-black/6 text-muted",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  success: "bg-primary-soft text-primary",
  info: "bg-[#e2ecf7] text-info",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
