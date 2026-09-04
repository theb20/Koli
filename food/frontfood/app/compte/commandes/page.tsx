"use client";

import { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { useOrderStore } from "@/lib/store/orderStore";
import { OrderCard } from "@/components/order/OrderCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function CommandesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const orders = useOrderStore((s) => s.orders);

  if (!mounted) return null;

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink-950">Mes commandes</h2>

      {orders.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={ClipboardList}
            title="Aucune commande pour le moment"
            description="Vos commandes de démonstration apparaîtront ici."
            action={
              <Button href="/recherche" size="sm">
                Découvrir des restaurants
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
