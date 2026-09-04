import { Bike, Star } from "lucide-react";
import type { DriverInfo } from "@/lib/types";
import { DEMO_MODE_COPY } from "@/lib/copy";

export function DriverInfoCard({ driver }: { driver: DriverInfo }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-ink-950/8 text-ink-950/50">
        <Bike size={20} />
      </div>
      <div className="flex-1">
        <p className="font-heading text-sm font-bold text-ink-950">{driver.name}</p>
        <p className="flex items-center gap-1 text-xs text-ink-950/50">
          {driver.vehicle}
          <span className="mx-1">·</span>
          <Star size={11} className="fill-brand-yellow text-brand-yellow" />
          {driver.rating.toFixed(1)}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-950/35">{DEMO_MODE_COPY.driver}</p>
      </div>
    </div>
  );
}
