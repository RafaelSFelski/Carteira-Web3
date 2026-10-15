import { CHAINS } from "@/lib/chains";
import type { ChainId } from "@/types/wallet";

const LLAMA_BASE = "https://coins.llama.fi/prices/current";

/** Keep request URLs under practical length limits. */
const CHUNK_SIZE = 40;

export interface TokenPrice {
  price: number;
  symbol?: string;
  decimals?: number;
}

/** Key format understood by the DefiLlama price API: `<chainSlug>:<address>`. */
export function priceKey(chain: ChainId, tokenAddress: string): string {
  return `${CHAINS[chain].priceSlug}:${tokenAddress.toLowerCase()}`;
}

interface LlamaPrice {
  price?: number;
  symbol?: string;
  decimals?: number;
  confidence?: number;
}

interface LlamaResponse {
  coins?: Record<string, LlamaPrice>;
}

/**
 * Batch USD price lookup (free, no API key).
 * Unknown tokens are simply absent from the returned map.
 */
export async function fetchTokenPrices(
  keys: string[],
  revalidateSeconds = 300,
): Promise<Map<string, TokenPrice>> {
  const unique = [...new Set(keys.filter(Boolean))];
  const out = new Map<string, TokenPrice>();
  if (unique.length === 0) return out;

  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    chunks.push(unique.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.allSettled(
    chunks.map(async (chunk) => {
      const url = `${LLAMA_BASE}/${chunk.join(",")}`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        next: { revalidate: revalidateSeconds },
      });
      if (!res.ok) throw new Error(`DefiLlama respondeu ${res.status}`);
      return (await res.json()) as LlamaResponse;
    }),
  );

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const [key, value] of Object.entries(result.value.coins ?? {})) {
      if (typeof value?.price !== "number" || !Number.isFinite(value.price)) continue;
      out.set(key.toLowerCase(), {
        price: value.price,
        symbol: value.symbol,
        decimals: value.decimals,
      });
    }
  }

  return out;
}