import type { OrderTotals as OrderTotalsType } from "@/lib/utils/pricing";
import { formatPriceCents } from "@/lib/utils/format";

function Row({ label, value, tone, bold }: { label: string; value: string; tone?: "success"; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-heading font-bold text-ink-950" : "text-ink-950/60"}>{label}</span>
      <span
        className={
          bold
            ? "font-heading text-lg font-extrabold text-ink-950"
            : tone === "success"
              ? "font-semibold text-cta-dark"
              : "font-medium text-ink-950"
        }
      >
        {value}
      </span>
    </div>
  );
}

export function OrderTotals({ totals }: { totals: OrderTotalsType }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <Row label="Sous-total" value={formatPriceCents(totals.subtotalCents)} />
      <Row label="Frais de livraison" value={formatPriceCents(totals.deliveryFeeCents)} />
      <Row label="Frais de service" value={formatPriceCents(totals.serviceFeeCents)} />
      {totals.discountCents > 0 && (
        <Row label="Réduction" value={`-${formatPriceCents(totals.discountCents)}`} tone="success" />
      )}
      {totals.tipCents > 0 && <Row label="Pourboire" value={formatPriceCents(totals.tipCents)} />}
      <div className="mt-1 border-t border-ink-950/10 pt-2.5">
        <Row label="Total" value={formatPriceCents(totals.totalCents)} bold />
      </div>
    </div>
  );
}
