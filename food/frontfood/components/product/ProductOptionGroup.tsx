import type { ProductOptionGroup as ProductOptionGroupType } from "@/lib/types";
import { formatPriceCents } from "@/lib/utils/format";

export function ProductOptionGroup({
  group,
  selectedIds,
  onToggle,
}: {
  group: ProductOptionGroupType;
  selectedIds: string[];
  onToggle: (optionId: string) => void;
}) {
  return (
    <fieldset className="border-t border-ink-950/8 py-4 first:border-0 first:pt-0">
      <legend className="flex w-full items-center justify-between pb-2">
        <span className="font-heading text-sm font-bold text-ink-950">{group.name}</span>
        <span className="text-xs text-ink-950/40">
          {group.required ? "Obligatoire" : "Optionnel"}
          {group.type === "multiple" && group.maxSelect > 1 ? ` · max ${group.maxSelect}` : ""}
        </span>
      </legend>

      <div className="flex flex-col gap-1.5">
        {group.options.map((option) => {
          const checked = selectedIds.includes(option.id);
          const atMax = group.type === "multiple" && !checked && selectedIds.length >= group.maxSelect;
          return (
            <label
              key={option.id}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                atMax ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-ink-950/5"
              } ${checked ? "bg-accent/8" : ""}`}
            >
              <span className="flex items-center gap-2.5">
                <input
                  type={group.type === "single" ? "radio" : "checkbox"}
                  name={group.id}
                  checked={checked}
                  disabled={atMax}
                  onChange={() => onToggle(option.id)}
                  className="h-4 w-4 accent-accent"
                />
                <span className="text-ink-950">{option.name}</span>
              </span>
              {option.priceDeltaCents > 0 && (
                <span className="text-xs font-semibold text-ink-950/50">
                  +{formatPriceCents(option.priceDeltaCents)}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
