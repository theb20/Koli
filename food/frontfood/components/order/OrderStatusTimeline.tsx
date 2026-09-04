import { CheckCircle2, Circle, ChefHat, PackageCheck, Bike, PartyPopper, ClipboardCheck } from "lucide-react";
import type { DeliveryMode, OrderStatus } from "@/lib/types";
import { formatOrderDate } from "@/lib/utils/format";

const STEP_STATUSES: OrderStatus[] = [
  "PAYMENT_CONFIRMED",
  "RESTAURANT_CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

function getSteps(deliveryMode: DeliveryMode) {
  const isPickup = deliveryMode === "retrait";
  return [
    { status: "PAYMENT_CONFIRMED" as const, icon: ClipboardCheck, label: "Commande confirmée", description: "La commande a été reçue." },
    { status: "RESTAURANT_CONFIRMED" as const, icon: CheckCircle2, label: "Restaurant confirmé", description: "Le restaurant a accepté votre commande." },
    { status: "PREPARING" as const, icon: ChefHat, label: "Préparation", description: "Le restaurant prépare votre commande." },
    { status: "READY_FOR_PICKUP" as const, icon: PackageCheck, label: isPickup ? "Prête à récupérer" : "Commande prête", description: isPickup ? "Votre commande vous attend au restaurant." : "La commande est prête, en attente du livreur." },
    { status: "OUT_FOR_DELIVERY" as const, icon: Bike, label: isPickup ? "En attente de retrait" : "Livraison en cours", description: isPickup ? "Vous pouvez venir la récupérer." : "Le livreur récupère et livre votre commande." },
    { status: "DELIVERED" as const, icon: PartyPopper, label: isPickup ? "Récupérée" : "Livrée", description: isPickup ? "Commande récupérée, bon appétit !" : "Votre commande a été livrée." },
  ];
}

export function OrderStatusTimeline({
  status,
  statusHistory,
  deliveryMode,
}: {
  status: OrderStatus;
  statusHistory: { status: OrderStatus; at: string }[];
  deliveryMode: DeliveryMode;
}) {
  const currentIndex = STEP_STATUSES.indexOf(status);
  const steps = getSteps(deliveryMode);

  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        const reached = i <= currentIndex;
        const isCurrent = i === currentIndex;
        const Icon = step.icon;
        const historyEntry = statusHistory.find((h) => h.status === step.status);

        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  reached ? "bg-cta text-white" : "bg-ink-950/8 text-ink-950/30"
                } ${isCurrent ? "ring-4 ring-cta/20" : ""}`}
              >
                {reached ? <CheckCircle2 size={18} /> : <Circle size={16} />}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-0.5 flex-1 ${i < currentIndex ? "bg-cta" : "bg-ink-950/10"}`} style={{ minHeight: 32 }} />
              )}
            </div>
            <div className="flex-1 pb-6">
              <div className="flex items-center gap-2">
                <Icon size={15} className={reached ? "text-cta-dark" : "text-ink-950/30"} />
                <p className={`font-heading text-sm font-bold ${reached ? "text-ink-950" : "text-ink-950/35"}`}>
                  {step.label}
                </p>
              </div>
              <p className={`mt-0.5 text-xs ${reached ? "text-ink-950/55" : "text-ink-950/30"}`}>{step.description}</p>
              {historyEntry && <p className="mt-0.5 text-[11px] text-ink-950/35">{formatOrderDate(historyEntry.at)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
