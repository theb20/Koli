import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-6 py-16 text-center shadow-card">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-950/5 text-ink-950/40">
        <Icon size={26} />
      </div>
      <h3 className="font-heading text-lg font-bold text-ink-950">{title}</h3>
      {description && <p className="max-w-xs text-sm text-ink-950/55">{description}</p>}
      {action}
    </div>
  );
}
