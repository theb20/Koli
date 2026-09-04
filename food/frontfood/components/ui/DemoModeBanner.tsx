import { Info } from "lucide-react";
import { DEMO_MODE_COPY } from "@/lib/copy";

type Variant = keyof typeof DEMO_MODE_COPY;

/**
 * Bannière de transparence : rappelle qu'aucune donnée n'est envoyée à un
 * vrai service (paiement, restaurant, livreur, GPS). Volontairement non
 * masquable définitivement — elle doit réapparaître à chaque visite.
 */
export function DemoModeBanner({ variant, compact = false }: { variant: Variant; compact?: boolean }) {
  return (
    <div
      role="status"
      className={`flex items-start gap-2.5 rounded-2xl border border-accent/25 bg-accent/8 text-ink-950/80 ${
        compact ? "px-3.5 py-2.5 text-xs" : "px-4 py-3.5 text-sm"
      }`}
    >
      <Info size={compact ? 14 : 16} className="mt-0.5 shrink-0 text-accent" />
      <p>{DEMO_MODE_COPY[variant]}</p>
    </div>
  );
}
