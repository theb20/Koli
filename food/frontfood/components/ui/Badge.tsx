import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-ink-950/6 text-ink-950/70",
  success: "bg-cta/10 text-cta-dark",
  warning: "bg-brand-yellow/25 text-ink-950",
  danger: "bg-maroon-600/10 text-maroon-600",
  brand: "bg-accent/10 text-accent",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
