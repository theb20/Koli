"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MapPin } from "lucide-react";
import { useAddressStore } from "@/lib/store/addressStore";
import { useCartStore } from "@/lib/store/cartStore";
import { AddressForm } from "@/components/checkout/AddressForm";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdressePage() {
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const addresses = useAddressStore((s) => s.addresses);
  const selectedAddressId = useAddressStore((s) => s.selectedAddressId);
  const selectAddress = useAddressStore((s) => s.selectAddress);
  const addAddress = useAddressStore((s) => s.addAddress);
  const cartItemCount = useCartStore((s) => s.items.length);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && addresses.length === 0) setShowForm(true);
  }, [mounted, addresses.length]);

  if (!mounted) return <div className="min-h-[60vh]" />;

  if (cartItemCount === 0) {
    return (
      <div className="mx-auto max-w-xl px-5 pt-24 sm:pt-28">
        <EmptyState
          icon={MapPin}
          title="Votre panier est vide"
          description="Ajoutez des plats avant de choisir une adresse de livraison."
          action={
            <Button href="/recherche" size="sm">
              Découvrir des restaurants
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-5 pb-28 pt-24 sm:px-8 sm:pt-28">
      <h1 className="font-heading text-2xl font-extrabold text-ink-950">Adresse de livraison</h1>

      {addresses.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          {addresses.map((addr) => (
            <label
              key={addr.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 shadow-card transition-colors ${
                selectedAddressId === addr.id ? "border-accent" : "border-transparent"
              }`}
            >
              <input
                type="radio"
                name="address"
                checked={selectedAddressId === addr.id}
                onChange={() => selectAddress(addr.id)}
                className="mt-1 h-4 w-4 accent-accent"
              />
              <div>
                <p className="font-heading text-sm font-bold text-ink-950">{addr.label}</p>
                <p className="text-sm text-ink-950/60">
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""} — {addr.codePostal} {addr.ville}
                </p>
                {addr.instructions && <p className="mt-1 text-xs italic text-ink-950/40">« {addr.instructions} »</p>}
              </div>
            </label>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="mt-5 rounded-2xl bg-white p-4 shadow-card">
          <AddressForm
            onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
            onSubmit={(data) => {
              const created = addAddress(data);
              selectAddress(created.id);
              setShowForm(false);
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-950/20 py-3.5 text-sm font-semibold text-ink-950/60 hover:border-accent hover:text-accent"
        >
          <Plus size={16} />
          Ajouter une adresse
        </button>
      )}

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-ink-950/10 bg-cream-100 px-5 py-3 sm:bottom-0">
        <div className="mx-auto max-w-xl">
          <Button
            fullWidth
            size="lg"
            disabled={!selectedAddressId}
            onClick={() => router.push("/commande/livraison")}
          >
            Continuer
          </Button>
        </div>
      </div>
    </div>
  );
}
