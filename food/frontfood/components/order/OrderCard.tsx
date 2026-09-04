import Image from "next/image";
import Link from "next/link";
import type { SimulatedOrder } from "@/lib/types";
import { formatOrderDate, formatPriceCents } from "@/lib/utils/format";
import { Badge } from "../ui/Badge";
import { ReorderButton } from "./ReorderButton";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  PAYMENT_CONFIRMED: "Confirmée",
  RESTAURANT_CONFIRMED: "Confirmée par le restaurant",
  PREPARING: "En préparation",
  READY_FOR_PICKUP: "Prête",
  OUT_FOR_DELIVERY: "En livraison",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  REJECTED: "Refusée",
  PAYMENT_FAILED: "Paiement échoué",
  REFUNDED: "Remboursée",
};

export function OrderCard({ order }: { order: SimulatedOrder }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          <Image src={order.restaurantImage} alt={order.restaurantName} fill sizes="56px" className="object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-heading text-sm font-bold text-ink-950">{order.restaurantName}</p>
            <Badge tone={order.status === "DELIVERED" ? "success" : "brand"}>
              {STATUS_LABELS[order.status] ?? order.status}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-ink-950/45">{formatOrderDate(order.createdAt)}</p>
          <p className="mt-1 text-sm text-ink-950/60">
            {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
          </p>
          <p className="mt-1 font-heading text-sm font-bold text-ink-950">{formatPriceCents(order.totalCents)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-ink-950/8 pt-3">
        <Link href={`/commande/suivi/${order.id}`} className="text-sm font-semibold text-accent">
          Voir la commande
        </Link>
        <ReorderButton order={order} />
      </div>
    </div>
  );
}
