"use client";

import { NEXT_TOUCH_CHIPS, type NextTouchPreset } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function NextTouchChips({
  value,
  onChange,
  emphasize,
}: {
  value: NextTouchPreset | "";
  onChange: (value: NextTouchPreset) => void;
  emphasize?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">Next touch</p>
        {emphasize && !value ? (
          <p className="text-xs text-amber-700">Set one — or Skip once</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {NEXT_TOUCH_CHIPS.map((chip) => {
          const selected = value === chip.value;
          const isSkip = chip.value === "skip";
          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => onChange(chip.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                selected && !isSkip && "border-[var(--ford-navy)] bg-[var(--ford-navy)] text-white",
                selected && isSkip && "border-zinc-700 bg-zinc-800 text-white",
                !selected &&
                  emphasize &&
                  "border-amber-300 bg-amber-50 text-amber-950",
                !selected &&
                  !emphasize &&
                  "border-border bg-background text-foreground hover:bg-muted",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
