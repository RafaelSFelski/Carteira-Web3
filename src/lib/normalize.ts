import { isChainId } from "@/lib/chains";
import type {
  MoralisDefiPositionToken,
  MoralisDefiPositionsResponse,
  MoralisHistoryItem,
  MoralisNetWorth,
  MoralisTokenBalance,
} from "@/lib/moralis";
import type {
  ChainBreakdown,
  ChainId,
  LendingPosition,
  LiquidationEvent,
  PoolPosition,
  SwapEvent,
  TokenBalance,
  TransferEvent,
} from "@/types/wallet";

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asChain(chain: string): ChainId | null {
  return isChainId(chain) ? chain : null;
}

export function normalizeBalances(
  chain: ChainId,
  tokens: MoralisTokenBalance[],
): TokenBalance[] {
  return tokens
    .filter((t) => !t.possible_spam)
    .map((t) => {
      const usdValue = toNumber(t.usd_value);
      const balanceFormatted =
        t.balance_formatted ??
        (t.balance && t.decimals != null
          ? String(Number(t.balance) / 10 ** Number(t.decimals))
          : t.balance ?? "0");

      return {
        chain,
        symbol: t.symbol || "???",
        name: t.name || t.symbol || "Unknown",
        logo: t.logo ?? null,
        balance: t.balance ?? "0",
        balanceFormatted,
        usdValue,
        tokenAddress: t.token_address ?? null,
        native: Boolean(t.native_token),
      } satisfies TokenBalance;
    })
    .filter((t) => toNumber(t.balanceFormatted) > 0 || t.usdValue > 0)
    .sort((a, b) => b.usdValue - a.usdValue);
}

export function normalizeChainBreakdown(
  netWorth: MoralisNetWorth,
): ChainBreakdown[] {
  return (netWorth.chains ?? [])
    .map((c) => {
      const chain = asChain(c.chain);
      if (!chain) return null;
      return {
        chain,
        usdValue: toNumber(c.networth_usd),
      } satisfies ChainBreakdown;
    })
    .filter((c): c is ChainBreakdown => c != null)
    .sort((a, b) => b.usdValue - a.usdValue);
}

function categoryOf(item: MoralisHistoryItem): string {
  return (item.category || "").toLowerCase();
}

function isTransferCategory(cat: string): boolean {
  return (
    cat === "send" ||
    cat === "receive" ||
    cat === "token send" ||
    cat === "token receive" ||
    cat.includes("airdrop")
  );
}

function isSwapCategory(cat: string): boolean {
  return (
    cat.includes("swap") ||
    cat.includes("trade") ||
    cat === "token swap" ||
    cat.includes("exchange")
  );
}

function isLiquidationCategory(cat: string, summary?: string): boolean {
  const s = `${cat} ${summary || ""}`.toLowerCase();
  return s.includes("liquidat");
}

export function normalizeTransfers(
  chain: ChainId,
  wallet: string,
  items: MoralisHistoryItem[],
): TransferEvent[] {
  const walletLower = wallet.toLowerCase();
  const events: TransferEvent[] = [];

  for (const item of items) {
    const cat = categoryOf(item);
    if (isSwapCategory(cat) || isLiquidationCategory(cat, item.summary)) continue;
    if (!isTransferCategory(cat) && !item.erc20_transfers?.length && !item.native_transfers?.length) {
      continue;
    }
    if (isSwapCategory(cat)) continue;

    const ts = item.block_timestamp || new Date().toISOString();
    const hash = item.hash || `${chain}-${ts}`;

    const erc20 = item.erc20_transfers ?? [];
    const native = item.native_transfers ?? [];

    if (erc20.length === 0 && native.length === 0) {
      const type: TransferEvent["type"] =
        cat.includes("receive") || item.to_address?.toLowerCase() === walletLower
          ? "receive"
          : "send";
      events.push({
        id: `${hash}-summary`,
        type,
        asset: "—",
        amount: "—",
        usdValue: null,
        chain,
        txHash: hash,
        timestamp: ts,
        counterparty:
          type === "send" ? item.to_address ?? null : item.from_address ?? null,
      });
      continue;
    }

    for (const [idx, t] of erc20.entries()) {
      const direction = (t.direction || "").toLowerCase();
      const type: TransferEvent["type"] =
        direction === "receive" || t.to_address?.toLowerCase() === walletLower
          ? "receive"
          : "send";
      events.push({
        id: `${hash}-erc20-${idx}`,
        type,
        asset: t.token_symbol || t.token_name || "TOKEN",
        amount: t.value_formatted || t.value || "0",
        usdValue: null,
        chain,
        txHash: hash,
        timestamp: ts,
        counterparty:
          type === "send" ? t.to_address ?? null : t.from_address ?? null,
        logo: t.token_logo ?? null,
      });
    }

    for (const [idx, t] of native.entries()) {
      const direction = (t.direction || "").toLowerCase();
      const type: TransferEvent["type"] =
        direction === "receive" || t.to_address?.toLowerCase() === walletLower
          ? "receive"
          : "send";
      events.push({
        id: `${hash}-native-${idx}`,
        type,
        asset: t.token_symbol || CHAINS_NATIVE[chain],
        amount: t.value_formatted || "0",
        usdValue: null,
        chain,
        txHash: hash,
        timestamp: ts,
        counterparty:
          type === "send" ? t.to_address ?? null : t.from_address ?? null,
      });
    }
  }

  return events;
}

const CHAINS_NATIVE: Record<ChainId, string> = {
  eth: "ETH",
  base: "ETH",
  arbitrum: "ETH",
  optimism: "ETH",
  polygon: "POL",
  bsc: "BNB",
  avalanche: "AVAX",
};

export function normalizeSwaps(
  chain: ChainId,
  items: MoralisHistoryItem[],
): SwapEvent[] {
  const swaps: SwapEvent[] = [];

  for (const item of items) {
    const cat = categoryOf(item);
    if (!isSwapCategory(cat) && !isLikelySwap(item)) continue;

    const ts = item.block_timestamp || new Date().toISOString();
    const hash = item.hash || `${chain}-${ts}`;
    const transfers = item.erc20_transfers ?? [];
    const outgoing = transfers.filter((t) => (t.direction || "").toLowerCase() === "send");
    const incoming = transfers.filter((t) => (t.direction || "").toLowerCase() === "receive");

    const tokenIn = outgoing[0];
    const tokenOut = incoming[0];

    swaps.push({
      id: `${hash}-swap`,
      tokenIn: tokenIn?.token_symbol || "?",
      tokenOut: tokenOut?.token_symbol || "?",
      amountIn: tokenIn?.value_formatted || "—",
      amountOut: tokenOut?.value_formatted || "—",
      usdValue: null,
      protocol: extractProtocol(item.summary),
      chain,
      txHash: hash,
      timestamp: ts,
      logoIn: tokenIn?.token_logo ?? null,
      logoOut: tokenOut?.token_logo ?? null,
    });
  }

  return swaps;
}

function isLikelySwap(item: MoralisHistoryItem): boolean {
  const transfers = item.erc20_transfers ?? [];
  if (transfers.length < 2) return false;
  const hasSend = transfers.some((t) => (t.direction || "").toLowerCase() === "send");
  const hasReceive = transfers.some((t) => (t.direction || "").toLowerCase() === "receive");
  return hasSend && hasReceive;
}

function extractProtocol(summary?: string): string | null {
  if (!summary) return null;
  // e.g. "Swapped 1 ETH for 3000 USDC on Uniswap"
  const onMatch = summary.match(/\bon\s+([A-Za-z0-9 ._-]+)/i);
  if (onMatch?.[1]) return onMatch[1].trim();
  return null;
}

export function normalizeLiquidations(
  chain: ChainId,
  items: MoralisHistoryItem[],
): LiquidationEvent[] {
  return items
    .filter((item) => isLiquidationCategory(categoryOf(item), item.summary))
    .map((item, idx) => {
      const hash = item.hash || `${chain}-liq-${idx}`;
      const transfers = item.erc20_transfers ?? [];
      const collateral = transfers.find((t) => (t.direction || "").toLowerCase() === "receive");
      const debt = transfers.find((t) => (t.direction || "").toLowerCase() === "send");

      return {
        id: `${hash}-liq`,
        protocol: extractProtocol(item.summary),
        collateral: collateral
          ? `${collateral.value_formatted || ""} ${collateral.token_symbol || ""}`.trim()
          : null,
        debt: debt
          ? `${debt.value_formatted || ""} ${debt.token_symbol || ""}`.trim()
          : null,
        usdValue: null,
        chain,
        txHash: hash,
        timestamp: item.block_timestamp || new Date().toISOString(),
        summary: item.summary ?? null,
      } satisfies LiquidationEvent;
    });
}

function mapDefiTokens(tokens: MoralisDefiPositionToken[] | undefined) {
  return (tokens ?? []).map((t) => ({
    symbol: t.symbol || t.name || "?",
    amount: t.balance_formatted || t.balance || "0",
    usdValue: toNumber(t.usd_value),
  }));
}

export function normalizeDefiPositions(
  chain: ChainId,
  data: MoralisDefiPositionsResponse,
): { lending: LendingPosition[]; pools: PoolPosition[] } {
  const lending: LendingPosition[] = [];
  const pools: PoolPosition[] = [];

  const protocols = data.result ?? [];

  for (const [pIdx, protocol] of protocols.entries()) {
    const protocolName = protocol.protocol_name || protocol.protocol_id || "Protocol";
    const protocolLogo = protocol.protocol_logo ?? null;

    // Flatten: some responses nest positions[], others have single position
    const positions =
      protocol.positions ??
      (protocol.position
        ? [
            {
              protocol_name: protocolName,
              protocol_logo: protocolLogo,
              account_data: protocol.account_data,
              position: protocol.position,
            },
          ]
        : []);

    for (const [idx, pos] of positions.entries()) {
      const label = (pos.position?.label || "").toLowerCase();
      const tokens = mapDefiTokens(pos.position?.tokens);
      const usdValue =
        toNumber(pos.position?.balance_usd) ||
        tokens.reduce((sum, t) => sum + t.usdValue, 0);

      const isLending =
        label.includes("lend") ||
        label.includes("supply") ||
        label.includes("borrow") ||
        label.includes("debt") ||
        label.includes("collateral") ||
        label.includes("aave") ||
        label.includes("compound");

      const isPool =
        label.includes("liquidity") ||
        label.includes("pool") ||
        label.includes("lp") ||
        label.includes("uniswap") ||
        label.includes("curve") ||
        label.includes("balancer");

      if (isLending || (!isPool && (label.includes("supply") || label.includes("borrow")))) {
        const supplyAssets = tokens.filter((t, i) => {
          const raw = pos.position?.tokens?.[i]?.token_type?.toLowerCase() || "";
          return (
            raw.includes("supply") ||
            raw.includes("collateral") ||
            raw.includes("deposit") ||
            (!raw.includes("borrow") && !raw.includes("debt"))
          );
        });
        const borrowAssets = tokens.filter((t, i) => {
          const raw = pos.position?.tokens?.[i]?.token_type?.toLowerCase() || "";
          return raw.includes("borrow") || raw.includes("debt");
        });

        lending.push({
          id: `${chain}-${protocolName}-lend-${pIdx}-${idx}`,
          protocol: protocolName,
          protocolLogo,
          chain,
          supplyAssets: supplyAssets.length ? supplyAssets : tokens,
          borrowAssets,
          usdValue,
          healthFactor: pos.account_data?.health_rate ?? null,
        });
        continue;
      }

      if (isPool || tokens.length >= 1) {
        pools.push({
          id: `${chain}-${protocolName}-pool-${pIdx}-${idx}`,
          protocol: protocolName,
          protocolLogo,
          chain,
          label: pos.position?.label || protocolName,
          assets: tokens,
          usdValue,
        });
      }
    }
  }

  return { lending, pools };
}
