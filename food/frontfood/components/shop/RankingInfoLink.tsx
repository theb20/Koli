"use client";

import { useUiStore } from "@/lib/store/uiStore";

export function RankingInfoLink() {
  const pushToast = useUiStore((s) => s.pushToast);

  return (
    <button
      onClick={() =>
        pushToast(
          "Classement local : restaurants sponsorisés d'abord, puis par note décroissante (voir le tri « Recommandé »).",
          "info"
        )
      }
      className="text-xs text-ink-950/40 underline underline-offset-2"
    >
      Découvrez comment les résultats sont classés.
    </button>
  );
}
