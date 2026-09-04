"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/store/cartStore";
import { formatPriceCents } from "@/lib/utils/format";

const PRESETS_CENTS = [0, 100, 200, 500];

export function TipSelector() {
  const tipCents = useCartStore((s) => s.tipCents);
  const setTip = useCartStore((s) => s.setTip);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const isCustomActive = customOpen || !PRESETS_CENTS.includes(tipCents);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESETS_CENTS.map((cents) => (
          <button
            key={cents}
            onClick={() => {
              setCustomOpen(false);
              setTip(cents);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              !isCustomActive && tipCents === cents
                ? "bg-accent text-white"
                : "bg-white text-ink-950/70 shadow-sm hover:bg-ink-950/5"
            }`}
          >
            {cents === 0 ? "Aucun" : formatPriceCents(cents)}
          </button>
        ))}
        <button
          onClick={() => setCustomOpen(true)}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            isCustomActive ? "bg-accent text-white" : "bg-white text-ink-950/70 shadow-sm hover:bg-ink-950/5"
          }`}
        >
          Autre
        </button>
      </div>

      {customOpen && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="0.5"
            value={customValue}
            onChange={(e) => {
              setCustomValue(e.target.value);
              const parsed = Math.max(0, Math.round(parseFloat(e.target.value || "0") * 100));
              setTip(Number.isFinite(parsed) ? parsed : 0);
            }}
            placeholder="Montant en €"
            className="w-32 rounded-full border border-ink-950/15 bg-white px-4 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
