"use client";

import { CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { useUiStore } from "@/lib/store/uiStore";

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const TONE_CLASSES = {
  success: "bg-ink-950 text-cream-100",
  error: "bg-maroon-600 text-white",
  info: "bg-ink-950 text-cream-100",
};

export function ToastPortal() {
  const toasts = useUiStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[1000] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone ?? "success"];
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-full px-5 py-3 text-sm font-medium shadow-card ${TONE_CLASSES[t.tone ?? "success"]}`}
          >
            <Icon size={16} className="shrink-0" />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
