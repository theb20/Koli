"use client";

import { useState } from "react";
import { Star } from "lucide-react";

type StarRatingProps = {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
};

export function StarRating({ rating, size = 14, interactive = false, onChange }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? rating;

  return (
    <div className="flex items-center gap-0.5" role={interactive ? "radiogroup" : undefined} aria-label={`Note : ${rating} sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const value = i + 1;
        const filled = value <= Math.round(display);
        const Star_ = (
          <Star
            key={value}
            size={size}
            className={filled ? "fill-brand-yellow text-brand-yellow" : "fill-ink-950/10 text-ink-950/10"}
          />
        );
        if (!interactive) return Star_;
        return (
          <button
            key={value}
            type="button"
            aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange?.(value)}
            className="p-0.5"
          >
            {Star_}
          </button>
        );
      })}
    </div>
  );
}
