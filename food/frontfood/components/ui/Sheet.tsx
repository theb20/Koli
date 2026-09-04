"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "bottom" | "right";
};

/** Bottom-sheet sur mobile, panneau latéral/modal centré sur desktop. */
export function Sheet({ open, onClose, title, children, side = "bottom" }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelPosition =
    side === "bottom"
      ? "inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
      : "inset-y-0 right-0 h-full w-full max-w-md";

  return (
    <div className="fixed inset-0 z-[999] flex">
      <button
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`absolute flex flex-col bg-cream-100 shadow-card outline-none ${panelPosition}`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-ink-950/10 px-5 py-4">
            <h2 className="font-heading text-lg font-bold text-ink-950">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-950/60 hover:bg-ink-950/5"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
