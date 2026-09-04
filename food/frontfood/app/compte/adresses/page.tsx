"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { useAddressStore } from "@/lib/store/addressStore";
import { AddressForm } from "@/components/checkout/AddressForm";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdressesPage() {
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  const addresses = useAddressStore((s) => s.addresses);
  const selectedAddressId = useAddressStore((s) => s.selectedAddressId);
  const addAddress = useAddressStore((s) => s.addAddress);
  const updateAddress = useAddressStore((s) => s.updateAddress);
  const removeAddress = useAddressStore((s) => s.removeAddress);
  const selectAddress = useAddressStore((s) => s.selectAddress);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const editingAddress = editingId && editingId !== "new" ? addresses.find((a) => a.id === editingId) : undefined;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-ink-950">Adresses</h2>
        {editingId === null && (
          <button
            onClick={() => setEditingId("new")}
            className="flex items-center gap-1.5 rounded-full bg-ink-950 px-4 py-2 text-xs font-semibold text-cream-100"
          >
            <Plus size={14} />
            Ajouter
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className="mt-4 max-w-md rounded-2xl bg-white p-4 shadow-card">
          <AddressForm
            initial={editingAddress}
            onCancel={() => setEditingId(null)}
            onSubmit={(data) => {
              if (editingAddress) updateAddress(editingAddress.id, data);
              else {
                const created = addAddress(data);
                if (!selectedAddressId) selectAddress(created.id);
              }
              setEditingId(null);
            }}
          />
        </div>
      )}

      {editingId === null && addresses.length === 0 && (
        <div className="mt-4">
          <EmptyState icon={MapPin} title="Aucune adresse enregistrée" description="Ajoutez une adresse pour accélérer vos prochaines commandes." />
        </div>
      )}

      {editingId === null && addresses.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-card">
              <div>
                <p className="flex items-center gap-2 font-heading text-sm font-bold text-ink-950">
                  {addr.label}
                  {selectedAddressId === addr.id && (
                    <span className="rounded-full bg-cta/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cta-dark">
                      Par défaut
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-ink-950/60">
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""} — {addr.codePostal} {addr.ville}
                </p>
                {selectedAddressId !== addr.id && (
                  <button
                    onClick={() => selectAddress(addr.id)}
                    className="mt-1.5 text-xs font-semibold text-accent"
                  >
                    Définir par défaut
                  </button>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditingId(addr.id)}
                  aria-label="Modifier"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-950/40 hover:bg-ink-950/5"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => removeAddress(addr.id)}
                  aria-label="Supprimer"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-950/40 hover:bg-maroon-600/10 hover:text-maroon-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
