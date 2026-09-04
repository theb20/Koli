"use client";

import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { useUiStore } from "@/lib/store/uiStore";
import { useCartStore } from "@/lib/store/cartStore";

export function CartConflictDialog() {
  const pending = useUiStore((s) => s.cartConflictPending);
  const resolve = useUiStore((s) => s.resolveCartConflict);
  const pushToast = useUiStore((s) => s.pushToast);
  const addItem = useCartStore((s) => s.addItem);

  if (!pending) return null;

  return (
    <Sheet open={Boolean(pending)} onClose={resolve} title="Nouveau restaurant">
      <div className="flex flex-col gap-4 px-5 py-5">
        <p className="text-sm text-ink-950/70">
          Votre panier contient des articles d&apos;un autre restaurant. Un panier ne peut contenir des plats
          que d&apos;un seul restaurant à la fois — voulez-vous le vider et le remplacer par{" "}
          <strong>{pending.product.name}</strong> ({pending.restaurant.name}) ?
        </p>
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={resolve}>
            Annuler
          </Button>
          <Button
            fullWidth
            onClick={() => {
              addItem(pending, true);
              resolve();
              pushToast(`${pending.product.name} ajouté — panier remplacé`);
            }}
          >
            Vider et remplacer
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
