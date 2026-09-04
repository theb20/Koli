import { formatPriceCents } from "@/lib/utils/format";

export function PriceTag({ cents, oldCents, size = "md" }: { cents: number; oldCents?: number; size?: "sm" | "md" | "lg" }) {
  const sizeClasses = { sm: "text-sm", md: "text-lg", lg: "text-2xl" }[size];
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={`font-heading font-extrabold text-maroon-600 ${sizeClasses}`}>{formatPriceCents(cents)}</span>
      {oldCents && oldCents > cents && (
        <span className="text-xs text-ink-950/40 line-through">{formatPriceCents(oldCents)}</span>
      )}
    </span>
  );
}
