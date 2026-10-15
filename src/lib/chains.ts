import type { ChainFilter, ChainId } from "@/types/wallet";

export interface ChainMeta {
  id: ChainId;
  name: string;
  shortName: string;
  explorerTx: (txHash: string) => string;
  explorerAddress: (address: string) => string;
  color: string;
  /** EVM chain id (numeric), used by the Etherscan API V2 */
  chainId: number;
  /** Symbol of the gas token */
  nativeSymbol: string;
  /** Slug used by the DefiLlama price API (https://coins.llama.fi) */
  priceSlug: string;
}

export const CHAINS: Record<ChainId, ChainMeta> = {
  eth: {
    id: "eth",
    name: "Ethereum",
    shortName: "ETH",
    explorerTx: (h) => `https://etherscan.io/tx/${h}`,
    explorerAddress: (a) => `https://etherscan.io/address/${a}`,
    color: "#627EEA",
    chainId: 1,
    nativeSymbol: "ETH",
    priceSlug: "ethereum",
  },
  base: {
    id: "base",
    name: "Base",
    shortName: "BASE",
    explorerTx: (h) => `https://basescan.org/tx/${h}`,
    explorerAddress: (a) => `https://basescan.org/address/${a}`,
    color: "#0052FF",
    chainId: 8453,
    nativeSymbol: "ETH",
    priceSlug: "base",
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum",
    shortName: "ARB",
    explorerTx: (h) => `https://arbiscan.io/tx/${h}`,
    explorerAddress: (a) => `https://arbiscan.io/address/${a}`,
    color: "#28A0F0",
    chainId: 42161,
    nativeSymbol: "ETH",
    priceSlug: "arbitrum",
  },
  optimism: {
    id: "optimism",
    name: "Optimism",
    shortName: "OP",
    explorerTx: (h) => `https://optimistic.etherscan.io/tx/${h}`,
    explorerAddress: (a) => `https://optimistic.etherscan.io/address/${a}`,
    color: "#FF0420",
    chainId: 10,
    nativeSymbol: "ETH",
    priceSlug: "optimism",
  },
  polygon: {
    id: "polygon",
    name: "Polygon",
    shortName: "POL",
    explorerTx: (h) => `https://polygonscan.com/tx/${h}`,
    explorerAddress: (a) => `https://polygonscan.com/address/${a}`,
    color: "#8247E5",
    chainId: 137,
    nativeSymbol: "POL",
    priceSlug: "polygon",
  },
  bsc: {
    id: "bsc",
    name: "BNB Chain",
    shortName: "BNB",
    explorerTx: (h) => `https://bscscan.com/tx/${h}`,
    explorerAddress: (a) => `https://bscscan.com/address/${a}`,
    color: "#F0B90B",
    chainId: 56,
    nativeSymbol: "BNB",
    priceSlug: "bsc",
  },
  avalanche: {
    id: "avalanche",
    name: "Avalanche",
    shortName: "AVAX",
    explorerTx: (h) => `https://snowtrace.io/tx/${h}`,
    explorerAddress: (a) => `https://snowtrace.io/address/${a}`,
    color: "#E84142",
    chainId: 43114,
    nativeSymbol: "AVAX",
    priceSlug: "avax",
  },
};

export const CHAIN_LIST: ChainId[] = [
  "eth",
  "base",
  "arbitrum",
  "optimism",
  "polygon",
  "bsc",
  "avalanche",
];

export function resolveChains(filter: ChainFilter): ChainId[] {
  if (filter === "all") return [...CHAIN_LIST];
  return [filter];
}

export function isChainId(value: string): value is ChainId {
  return value in CHAINS;
}

export function isChainFilter(value: string): value is ChainFilter {
  return value === "all" || isChainId(value);
}

export function getExplorerTx(chain: ChainId, txHash: string): string {
  return CHAINS[chain].explorerTx(txHash);
}

export function getChainName(chain: ChainId): string {
  return CHAINS[chain].name;
}
