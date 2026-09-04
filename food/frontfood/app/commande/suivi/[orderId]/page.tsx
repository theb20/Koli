"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PackageSearch, Star } from "lucide-react";
import { useOrderStore } from "@/lib/store/orderStore";
import { DemoModeBanner } from "@/components/ui/DemoModeBanner";
import { OrderStatusTimeline } from "@/components/order/OrderStatusTimeline";
import { SimulationControl } from "@/components/order/SimulationControl";
import { DriverInfoCard } from "@/components/order/DriverInfoCard";
import { DeliveryMapPlaceholder } from "@/components/order/DeliveryMapPlaceholder";
import { EmptyState } from "@/components/ui/EmptyState";
import { StarRating } from "@/components/ui/StarRating";
import { Button } from "@/components/ui/Button";
import { formatPriceCents } from "@/lib/utils/format";

export default function SuiviPage({ params }: { params: { orderId: string } }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const order = useOrderStore((s) => s.orders.find((o) => o.id === params.orderId));
  const rateOrder = useOrderStore((s) => s.rateOrder);
  const [rating, setRating] = useState(0);

  if (!mounted) return <div className="min-h-[60vh]" />;

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-24 sm:pt-28">
        <EmptyState
          icon={PackageSearch}
          title="Commande introuvable"
          description="Cette commande de démonstration n'existe pas ou plus dans ce navigateur."
          action={
            <Button href="/compte/commandes" size="sm">
              Voir mes commandes
            </Button>
          }
        />
      </div>
    );
  }

  const showDriver = order.status === "OUT_FOR_DELIVERY" || order.status === "DELIVERED";
  const showMap = order.status !== "PAYMENT_CONFIRMED" && order.deliveryMode !== "retrait";
  const isDelivered = order.status === "DELIVERED";

  return (
    <div className="mx-auto max-w-xl px-5 pb-16 pt-24 sm:px-8 sm:pt-28">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
          <Image src={order.restaurantImage} alt={order.restaurantName} fill sizes="48px" className="object-cover" />
        </div>
        <div>
          <h1 className="font-heading text-lg font-extrabold text-ink-950">{order.restaurantName}</h1>
          <p className="text-xs text-ink-950/45">{order.id}</p>
        </div>
      </div>

      <div className="mt-4">
        <DemoModeBanner variant="tracking" compact />
      </div>

      {showMap && (
        <div className="mt-4">
          <DeliveryMapPlaceholder />
        </div>
      )}

      {showDriver && order.driver && (
        <div className="mt-4">
          <DriverInfoCard driver={order.driver} />
        </div>
      )}

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-card">
        <OrderStatusTimeline status={order.status} statusHistory={order.statusHistory} deliveryMode={order.deliveryMode} />
      </div>

      <div className="mt-4">
        <SimulationControl orderId={order.id} status={order.status} />
      </div>

      {isDelivered && (
        <div className="mt-6 rounded-2xl bg-white p-5 text-center shadow-card">
          {order.restaurantRated ? (
            <p className="text-sm font-semibold text-cta-dark">Merci pour votre avis !</p>
          ) : (
            <>
              <p className="font-heading text-sm font-bold text-ink-950">Notez votre commande</p>
              <div className="mt-3 flex justify-center">
                <StarRating rating={rating} size={26} interactive onChange={setRating} />
              </div>
              <Button
                size="sm"
                className="mt-3"
                disabled={rating === 0}
                onClick={() => rateOrder(order.id)}
              >
                Envoyer mon avis
              </Button>
            </>
          )}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between rounded-2xl bg-white p-4 text-sm shadow-card">
        <span className="text-ink-950/60">Total payé</span>
        <span className="font-heading font-bold text-ink-950">{formatPriceCents(order.totalCents)}</span>
      </div>
    </div>
  );
}
