import { MapPinned } from "lucide-react";
import { DEMO_MODE_COPY } from "@/lib/copy";

export function DeliveryMapPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-950/15 bg-ink-950/[0.03] px-6 py-10 text-center">
      <MapPinned size={24} className="text-ink-950/25" />
      <p className="max-w-xs text-xs text-ink-950/45">{DEMO_MODE_COPY.map}</p>
    </div>
  );
}
