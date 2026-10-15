"use client";

import { ChainSelector } from "@/components/ChainSelector";
import { isValidAddress } from "@/lib/validateAddress";
import type { ChainFilter } from "@/types/wallet";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const STORAGE_KEY = "web3-wallet-last-address";
const CHAIN_KEY = "web3-wallet-last-chain";

interface AddressFormProps {
  initialAddress?: string;
  initialChain?: ChainFilter;
  compact?: boolean;
}

export function AddressForm({
  initialAddress = "",
  initialChain = "all",
  compact = false,
}: AddressFormProps) {
  const router = useRouter();
  const [address, setAddress] = useState(initialAddress);
  const [chain, setChain] = useState<ChainFilter>(initialChain);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAddress) return;
    try {
      // Deferring restoration keeps initial state aligned between server HTML
      // and hydration, while avoiding synchronous state updates in the effect.
      const timer = window.setTimeout(() => {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          const savedChain = localStorage.getItem(CHAIN_KEY);
          if (saved) setAddress(saved);
          if (savedChain === "all" || savedChain === "eth" || savedChain === "base" || savedChain === "arbitrum" || savedChain === "optimism" || savedChain === "polygon" || savedChain === "bsc" || savedChain === "avalanche") {
            setChain(savedChain);
          }
        } catch {
          // Storage may be unavailable in private browsing contexts.
        }
      }, 0);
      return () => window.clearTimeout(timer);
    } catch {
      // Storage may be unavailable in private browsing contexts.
    }
  }, [initialAddress]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!isValidAddress(trimmed)) {
      setError("Informe um endereço EVM válido (0x + 40 caracteres hex).");
      return;
    }
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
      localStorage.setItem(CHAIN_KEY, chain);
    } catch {
      // ignore
    }
    router.push(`/wallet/${trimmed}?chain=${chain}`);
  }

  return (
    <form onSubmit={onSubmit} className={`w-full ${compact ? "" : "max-w-2xl"}`}>
      <label htmlFor="wallet-address" className="mb-2 block text-sm text-[var(--muted)]">
        Endereço da carteira
      </label>
      <div className={`flex flex-col gap-3 ${compact ? "sm:flex-row sm:items-end" : ""}`}>
        <div className="flex-1">
          <input
            id="wallet-address"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x…"
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-sm text-[var(--foreground)] outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-fg)] transition hover:brightness-110"
        >
          Analisar
        </button>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-sm text-[var(--muted)]">Rede</p>
        <ChainSelector value={chain} onChange={setChain} />
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
