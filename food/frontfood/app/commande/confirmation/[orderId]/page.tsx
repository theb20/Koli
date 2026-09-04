"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PartyPopper, Clock } from "lucide-react";
import { useOrderStore } from "@/lib/store/orderStore";
import { useCartStore } from "@/lib/store/cartStore";
import { DemoModeBanner } from "@/components/ui/DemoModeBanner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPriceCents } from "@/lib/utils/format";

export default function ConfirmationPage({ params }: { params: { orderId: string } }) {
  const [mounted, setMounted] = useState(false);
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    setMounted(true);
    // La commande est déjà créée à ce stade — on vide le panier ici plutôt
    // que sur la page paiement pour ne pas déclencher sa garde "panier vide".
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const order = useOrderStore((s) => s.orders.find((o) => o.id === params.orderId));

  if (!mounted) return <div className="min-h-[60vh]" />;

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-24 sm:pt-28">
        <EmptyState
          icon={PartyPopper}
          title="Commande introuvable"
          description="Cette commande de démonstration n'existe pas ou plus dans ce navigateur."
          action={
            <Button href="/" size="sm">
              Retour à l&apos;accueil
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 pb-16 pt-24 text-center sm:px-8 sm:pt-28">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cta/10 text-cta-dark">
        <PartyPopper size={28} />
      </div>
      <h1 className="font-heading mt-4 text-2xl font-extrabold text-ink-950 sm:text-3xl">Commande confirmée</h1>
      <p className="mt-1 font-heading text-sm font-bold text-ink-950/50">{order.id}</p>

      <div className="mt-5 text-left">
        <DemoModeBanner variant="payment" compact />
      </div>

      <div className="mt-5 rounded-2xl bg-white p-5 text-left shadow-card">
        <p className="font-heading text-base font-bold text-ink-950">{order.restaurantName}</p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-950/60">
          {order.items.map((item, i) => (
            <li key={i}>
              {item.quantity} × {item.name}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-ink-950/8 pt-3">
          <span className="font-heading text-sm font-bold text-ink-950">Total</span>
          <span className="font-heading text-lg font-extrabold text-ink-950">{formatPriceCents(order.totalCents)}</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-950/45">
          <Clock size={13} />
          Livraison à {order.address.line1}, {order.address.ville}
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Button href={`/commande/suivi/${order.id}`} size="lg">
          Suivre ma commande
        </Button>
        <Link href="/" className="text-sm font-semibold text-ink-950/50 hover:text-ink-950">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
