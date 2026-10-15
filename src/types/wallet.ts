export type ChainId =
  | "eth"
  | "base"
  | "arbitrum"
  | "optimism"
  | "polygon"
  | "bsc"
  | "avalanche";

export type ChainFilter = ChainId | "all";

export type PeriodFilter = "7d" | "30d" | "90d" | "all";

export interface TokenBalance {
  chain: ChainId;
  symbol: string;
  name: string;
  logo?: string | null;
  balance: string;
  balanceFormatted: string;
  usdValue: number;
  tokenAddress?: string | null;
  native: boolean;
}

export interface ChainBreakdown {
  chain: ChainId;
  usdValue: number;
}

export interface WalletOverview {
  address: string;
  totalUsd: number;
  balances: TokenBalance[];
  chainBreakdown: ChainBreakdown[];
  counts: {
    transfers: number;
    swaps: number;
    lendingPositions: number;
    poolPositions: number;
    liquidations: number;
  };
  /** Non-fatal provider problems, surfaced in the UI instead of failing silently. */
  warnings?: string[];
}

export interface TransferEvent {
  id: string;
  type: "send" | "receive";
  asset: string;
  amount: string;
  usdValue: number | null;
  chain: ChainId;
  txHash: string;
  timestamp: string;
  counterparty?: string | null;
  logo?: string | null;
}

export interface SwapEvent {
  id: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  usdValue: number | null;
  protocol?: string | null;
  chain: ChainId;
  txHash: string;
  timestamp: string;
  logoIn?: string | null;
  logoOut?: string | null;
}

export interface LendingPosition {
  id: string;
  protocol: string;
  protocolLogo?: string | null;
  chain: ChainId;
  supplyAssets: Array<{ symbol: string; amount: string; usdValue: number }>;
  borrowAssets: Array<{ symbol: string; amount: string; usdValue: number }>;
  usdValue: number;
  healthFactor?: number | null;
}

export interface PoolPosition {
  id: string;
  protocol: string;
  protocolLogo?: string | null;
  chain: ChainId;
  label: string;
  assets: Array<{ symbol: string; amount: string; usdValue: number }>;
  usdValue: number;
}

export interface LiquidationEvent {
  id: string;
  protocol?: string | null;
  collateral?: string | null;
  debt?: string | null;
  usdValue: number | null;
  chain: ChainId;
  txHash: string;
  timestamp: string;
  summary?: string | null;
}

export interface ApiErrorBody {
  error: string;
  details?: string;
}
