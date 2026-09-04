"use client";

import { ArrowRight, RotateCcw } from "lucide-react";
import type { OrderStatus } from "@/lib/types";
import { ORDER_STATUS_SEQUENCE } from "@/lib/types";
import { useOrderStore } from "@/lib/store/orderStore";
import { Button } from "../ui/Button";

export function SimulationControl({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const advanceStatus = useOrderStore((s) => s.advanceStatus);
  const resetStatus = useOrderStore((s) => s.resetStatus);

  const isFinal = status === ORDER_STATUS_SEQUENCE[ORDER_STATUS_SEQUENCE.length - 1];

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent">Contrôle de simulation</p>
      {isFinal ? (
        <>
          <p className="text-sm text-ink-950/60">Commande livrée — fin de la simulation.</p>
          <Button variant="outline" size="sm" onClick={() => resetStatus(orderId)}>
            <RotateCcw size={14} />
            Réinitialiser la simulation
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-ink-950/60">Aucun restaurant ni livreur réel ne fait avancer cette commande.</p>
          <Button size="sm" onClick={() => advanceStatus(orderId)}>
            Avancer la simulation
            <ArrowRight size={14} />
          </Button>
        </>
      )}
    </div>
  );
}
