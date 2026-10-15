import { CHAINS, resolveChains } from "@/lib/chains";
import {
  getEtherscanBalances,
  getEtherscanTransfers,
} from "@/lib/etherscanService";
import { periodToFromDate } from "@/lib/format";
import {
  moralisGet,
  type MoralisDefiPositionsResponse,
  type MoralisHistoryResponse,
  type MoralisNetWorth,
} from "@/lib/moralis";
import {
  normalizeChainBreakdown,
  normalizeDefiPositions,
  normalizeLiquidations,
  normalizeSwaps,
  normalizeTransfers,
} from "@/lib/normalize";
import type {
  ChainFilter,
  ChainId,
  LendingPosition,
  LiquidationEvent,
  PeriodFilter,
  PoolPosition,
  SwapEvent,
  TransferEvent,
  WalletOverview,
} from "@/types/wallet";

async function fetchHistoryForChain(
  address: string,
  chain: ChainId,
  fromDate?: string,
  limit = 100,
): Promise<MoralisHistoryResponse> {
  return moralisGet<MoralisHistoryResponse>(`/wallets/${address}/history`, {
    chain,
    order: "DESC",
    limit,
    from_date: fromDate,
    nft_metadata: false,
  });
}

async function fetchDefiForChain(
  address: string,
  chain: ChainId,
): Promise<MoralisDefiPositionsResponse> {
  try {
    return await moralisGet<MoralisDefiPositionsResponse>(
      `/wallets/${address}/defi/positions`,
      { chain },
    );
  } catch {
    // Some chains may not support DeFi positions
    return { result: [] };
  }
}

async function mapSettled<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = await Promise.allSettled(items.map(fn));
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}

export async function getWalletOverview(
  address: string,
  chainFilter: ChainFilter,
): Promise<WalletOverview> {
  const chains = resolveChains(chainFilter);
  const warnings: string[] = [];

  // Balances come straight from the chain (Etherscan API V2); Moralis is kept
  // only for the decoded DeFi counters, which no free provider offers.
  const onChain = await getEtherscanBalances(address, chainFilter).catch((error) => {
    warnings.push(
      error instanceof Error
        ? `Saldos indisponíveis: ${error.message}`
        : "Saldos indisponíveis.",
    );
    return null;
  });

  if (onChain?.unsupportedChains.length) {
    warnings.push(
      `Fora do plano Etherscan gratuito: ${onChain.unsupportedChains
        .map((chain) => CHAINS[chain].name)
        .join(", ")}.`,
    );
  }
  warnings.push(...(onChain?.errors ?? []));

  const netWorthParams: Record<string, string | number | boolean | string[]> = {
    exclude_spam: true,
    exclude_unverified_contracts: true,
    max_token_inactivity: 1,
    min_pair_side_liquidity_usd: 1000,
  };
  netWorthParams.chains = chains;

  const [netWorth, historyGroups, defiGroups] = await Promise.all([
    moralisGet<MoralisNetWorth>(`/wallets/${address}/net-worth`, netWorthParams).catch(
      () => ({ total_networth_usd: "0", chains: [] }) as MoralisNetWorth,
    ),
    mapSettled(chains, async (chain) => ({
      chain,
      history: await fetchHistoryForChain(address, chain, undefined, 50),
    })),
    mapSettled(chains, async (chain) => ({
      chain,
      defi: await fetchDefiForChain(address, chain),
    })),
  ]);

  const balances = onChain?.data.balances ?? [];

  let transfers = 0;
  let swaps = 0;
  let liquidations = 0;
  for (const { chain, history } of historyGroups) {
    const items = history.result ?? [];
    transfers += normalizeTransfers(chain, address, items).length;
    swaps += normalizeSwaps(chain, items).length;
    liquidations += normalizeLiquidations(chain, items).length;
  }

  let lendingPositions = 0;
  let poolPositions = 0;
  for (const { chain, defi } of defiGroups) {
    const { lending, pools } = normalizeDefiPositions(chain, defi);
    lendingPositions += lending.length;
    poolPositions += pools.length;
  }

  const totalUsd =
    onChain?.data.totalUsd || Number(netWorth.total_networth_usd || 0) || 0;

  const chainBreakdown =
    onChain?.data.chainBreakdown.length
      ? onChain.data.chainBreakdown
      : normalizeChainBreakdown(netWorth);

  return {
    address,
    totalUsd,
    balances: balances.slice(0, 50),
    chainBreakdown,
    counts: {
      transfers,
      swaps,
      lendingPositions,
      poolPositions,
      liquidations,
    },
    warnings: warnings.length ? warnings : undefined,
  };
}

export async function getTransfers(
  address: string,
  chainFilter: ChainFilter,
  period: PeriodFilter,
): Promise<TransferEvent[]> {
  const fromDate = periodToFromDate(period);
  const fromTimestamp = fromDate
    ? Math.floor(new Date(fromDate).getTime() / 1000)
    : undefined;

  const onChain = await getEtherscanTransfers(address, chainFilter, fromTimestamp).catch(
    () => null,
  );

  if (onChain && (onChain.data.length > 0 || onChain.unsupportedChains.length > 0)) {
    return onChain.data;
  }

  // Fallback: decoded history from Moralis.
  const chains = resolveChains(chainFilter);
  const groups = await mapSettled(chains, async (chain) => {
    const history = await fetchHistoryForChain(address, chain, fromDate, 100);
    return normalizeTransfers(chain, address, history.result ?? []);
  });
  return groups.flat().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getSwaps(
  address: string,
  chainFilter: ChainFilter,
  period: PeriodFilter,
): Promise<SwapEvent[]> {
  const chains = resolveChains(chainFilter);
  const fromDate = periodToFromDate(period);
  const groups = await mapSettled(chains, async (chain) => {
    const history = await fetchHistoryForChain(address, chain, fromDate, 100);
    return normalizeSwaps(chain, history.result ?? []);
  });
  return groups.flat().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getLiquidations(
  address: string,
  chainFilter: ChainFilter,
  period: PeriodFilter,
): Promise<LiquidationEvent[]> {
  const chains = resolveChains(chainFilter);
  const fromDate = periodToFromDate(period);
  const groups = await mapSettled(chains, async (chain) => {
    const history = await fetchHistoryForChain(address, chain, fromDate, 100);
    return normalizeLiquidations(chain, history.result ?? []);
  });
  return groups.flat().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function getPositions(
  address: string,
  chainFilter: ChainFilter,
): Promise<{ lending: LendingPosition[]; pools: PoolPosition[] }> {
  const chains = resolveChains(chainFilter);
  const groups = await mapSettled(chains, async (chain) => {
    const defi = await fetchDefiForChain(address, chain);
    return normalizeDefiPositions(chain, defi);
  });

  return {
    lending: groups.flatMap((g) => g.lending),
    pools: groups.flatMap((g) => g.pools),
  };
}
