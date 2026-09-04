"use client";

import { useEffect, useState } from "react";
import { FavoritesGrid } from "@/components/account/FavoritesGrid";

export default function FavorisPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div>
      <h2 className="font-heading text-lg font-bold text-ink-950">Mes favoris</h2>
      <div className="mt-4">
        <FavoritesGrid />
      </div>
    </div>
  );
}
