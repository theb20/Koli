"use client";

import { useState, type FormEvent } from "react";
import { Home, Briefcase, MapPin } from "lucide-react";
import type { Address, AddressType } from "@/lib/types";
import { Button } from "../ui/Button";

const TYPES: { value: AddressType; label: string; icon: typeof Home }[] = [
  { value: "domicile", label: "Domicile", icon: Home },
  { value: "travail", label: "Travail", icon: Briefcase },
  { value: "autre", label: "Autre", icon: MapPin },
];

export function AddressForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Address;
  onSubmit: (data: Omit<Address, "id">) => void;
  onCancel?: () => void;
}) {
  const [type, setType] = useState<AddressType>(initial?.type ?? "domicile");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [line1, setLine1] = useState(initial?.line1 ?? "");
  const [line2, setLine2] = useState(initial?.line2 ?? "");
  const [ville, setVille] = useState(initial?.ville ?? "");
  const [codePostal, setCodePostal] = useState(initial?.codePostal ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const finalLabel = label.trim() || TYPES.find((t) => t.value === type)!.label;
    onSubmit({ type, label: finalLabel, line1, line2: line2 || undefined, ville, codePostal, instructions: instructions || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2">
        {TYPES.map((t) => {
          const Icon = t.icon;
          const active = type === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-semibold transition-colors ${
                active ? "border-accent bg-accent/8 text-accent" : "border-ink-950/10 text-ink-950/60"
              }`}
            >
              <Icon size={18} />
              {t.label}
            </button>
          );
        })}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink-950">Nom de l&apos;adresse (optionnel)</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={TYPES.find((t) => t.value === type)!.label}
          className="rounded-xl border border-ink-950/15 bg-white px-4 py-2.5 focus:border-accent focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink-950">Adresse</span>
        <input
          required
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
          placeholder="12 rue de la Grillade"
          className="rounded-xl border border-ink-950/15 bg-white px-4 py-2.5 focus:border-accent focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink-950">Complément (optionnel)</span>
        <input
          value={line2}
          onChange={(e) => setLine2(e.target.value)}
          placeholder="Appartement, étage, bâtiment…"
          className="rounded-xl border border-ink-950/15 bg-white px-4 py-2.5 focus:border-accent focus:outline-none"
        />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-semibold text-ink-950">Code postal</span>
          <input
            required
            value={codePostal}
            onChange={(e) => setCodePostal(e.target.value)}
            placeholder="75011"
            className="rounded-xl border border-ink-950/15 bg-white px-4 py-2.5 focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex flex-[2] flex-col gap-1 text-sm">
          <span className="font-semibold text-ink-950">Ville</span>
          <input
            required
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Paris"
            className="rounded-xl border border-ink-950/15 bg-white px-4 py-2.5 focus:border-accent focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink-950">Instructions pour le livreur (optionnel)</span>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Sonner à l'interphone, code d'entrée…"
          rows={2}
          className="resize-none rounded-xl border border-ink-950/15 bg-white px-4 py-2.5 focus:border-accent focus:outline-none"
        />
      </label>

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="outline" fullWidth onClick={onCancel}>
            Annuler
          </Button>
        )}
        <Button type="submit" fullWidth>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
