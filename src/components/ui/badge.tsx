import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/utils";

interface BadgeProps {
  label: string;
  variant?: "status" | "platform" | "custom";
  className?: string;
}

export function Badge({ label, variant = "custom", className }: BadgeProps) {
  const statusClass =
    variant === "status" ? (STATUS_COLORS[label.toLowerCase()] ?? "bg-slate-100 text-slate-700") : "";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        variant === "platform" && "bg-slate-100 text-slate-700",
        statusClass,
        className
      )}
    >
      {label}
    </span>
  );
}
