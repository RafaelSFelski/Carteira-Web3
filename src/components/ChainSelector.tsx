"use client";

import { CHAINS, CHAIN_LIST } from "@/lib/chains";
import type { ChainFilter } from "@/types/wallet";

interface ChainSelectorProps {
  value: ChainFilter;
  onChange: (value: ChainFilter) => void;
}

export function ChainSelector({ value, onChange }: ChainSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Selecionar rede">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          value === "all"
            ? "bg-[var(--accent)] text-[var(--accent-fg)]"
            : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
      >
        Todas
      </button>
      {CHAIN_LIST.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === id
              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
              : "bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: CHAINS[id].color }}
            aria-hidden
          />
          {CHAINS[id].shortName}
        </button>
      ))}
    </div>
  );
}
