import { CHAINS, getChainName, resolveChains } from "@/lib/chains";
import {
  EtherscanError,
  fetchNativeBalance,
  fetchNativePriceUsd,
  fetchTokenBalanceRaw,
  fetchTokenTransfers,
  hasEtherscanKey,
  isChainSupportedByPlan,
  type EtherscanTokenTx,
} from "@/lib/etherscan";
import { fetchTokenPrices, priceKey } from "@/lib/prices";
import { TOKEN_REGISTRY } from "@/lib/tokenRegistry";
import type {
  ChainBreakdown,
  ChainFilter,
  ChainId,
  TokenBalance,
  TransferEvent,
} from "@/types/wallet";

const NATIVE_DECIMALS = 18;

/** Upper bound of token balance lookups per chain (free tier is 3 calls/s). */
const MAX_TOKENS_PER_CHAIN = 8;

/** Transfer history page used only to discover which tokens the wallet holds. */
const DISCOVERY_PAGE_SIZE = 50;

export interface EtherscanResult<T> {
  data: T;
  /** Chains skipped because the current plan does not cover them. */
  unsupportedChains: ChainId[];
  errors: string[];
}

interface DiscoveredToken {
  address: string;
  symbol: string;
  decimals: number;
}

function toNumber(value: string | undefined | null): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatAmount(raw: string | undefined, decimals: number): string {
  const n = toNumber(raw);
  if (n === 0) return "0";
  return String(n / 10 ** decimals);
}

/** Tokens seen in the wallet's own history, with the metadata the API returns. */
function discoverTokens(transfers: EtherscanTokenTx[]): DiscoveredToken[] {
  const seen = new Map<string, DiscoveredToken>();
  for (const tx of transfers) {
    const address = tx.contractAddress?.toLowerCase();
    if (!address || seen.has(address)) continue;
    seen.set(address, {
      address,
      symbol: tx.tokenSymbol || "TOKEN",
      decimals: Number(tx.tokenDecimal ?? 18) || 18,
    });
  }
  return [...seen.values()];
}

function candidateTokens(chain: ChainId, transfers: EtherscanTokenTx[]): DiscoveredToken[] {
  const discovered = discoverTokens(transfers);
  const registry = TOKEN_REGISTRY[chain].map((t) => ({ ...t }));
  const merged = new Map<string, DiscoveredToken>();

  // Registry first, then history wins for symbol/decimals when available.
  for (const token of registry) merged.set(token.address, token);
  for (const token of discovered) merged.set(token.address, token);

  return [...merged.values()].slice(0, MAX_TOKENS_PER_CHAIN);
}

/* ------------------------------------------------------------------ *
 * Balances
 * ------------------------------------------------------------------ */

async function balancesForChain(
  chain: ChainId,
  address: string,
): Promise<TokenBalance[]> {
  const [nativeRaw, transfers] = await Promise.all([
    fetchNativeBalance(chain, address),
    fetchTokenTransfers(chain, address, DISCOVERY_PAGE_SIZE).catch(() => [] as EtherscanTokenTx[]),
  ]);

  const candidates = candidateTokens(chain, transfers);
  const raws = await Promise.all(
    candidates.map((token) =>
      fetchTokenBalanceRaw(chain, address, token.address).catch(() => null),
    ),
  );

  const balances: TokenBalance[] = [];

  const nativeFormatted = toNumber(nativeRaw) / 10 ** NATIVE_DECIMALS;
  if (nativeFormatted > 0) {
    balances.push({
      chain,
      symbol: CHAINS[chain].nativeSymbol,
      name: `${CHAINS[chain].nativeSymbol} (${getChainName(chain)})`,
      balance: nativeRaw,
      balanceFormatted: String(nativeFormatted),
      usdValue: 0,
      tokenAddress: null,
      native: true,
    });
  }

  candidates.forEach((token, index) => {
    const raw = raws[index];
    if (!raw) return;
    const formatted = toNumber(raw) / 10 ** token.decimals;
    if (formatted <= 0) return;
    balances.push({
      chain,
      symbol: token.symbol,
      name: token.symbol,
      balance: raw,
      balanceFormatted: String(formatted),
      usdValue: 0,
      tokenAddress: token.address,
      native: false,
    });
  });

  return balances;
}

/**
 * Balances read straight from the chain via the Etherscan API, priced with the
 * free DefiLlama feed. Chains outside the current plan are reported instead of
 * failing the whole request.
 */
export async function getEtherscanBalances(
  address: string,
  chainFilter: ChainFilter,
): Promise<EtherscanResult<{ balances: TokenBalance[]; chainBreakdown: ChainBreakdown[]; totalUsd: number }>> {
  if (!hasEtherscanKey()) {
    return { data: { balances: [], chainBreakdown: [], totalUsd: 0 }, unsupportedChains: [], errors: [] };
  }

  const chains = resolveChains(chainFilter).filter(isChainSupportedByPlan);
  const unsupportedChains: ChainId[] = [];
  const errors: string[] = [];

  const settled = await Promise.allSettled(
    chains.map(async (chain) => ({ chain, balances: await balancesForChain(chain, address) })),
  );

  let balances: TokenBalance[] = [];
  for (const [index, result] of settled.entries()) {
    if (result.status === "fulfilled") {
      balances = balances.concat(result.value.balances);
      continue;
    }
    const reason = result.reason as EtherscanError;
    if (reason?.chainUnavailable) {
      unsupportedChains.push(chains[index]);
    } else {
      errors.push(reason?.message || `Falha ao ler ${CHAINS[chains[index]].name}.`);
    }
  }

  balances = await applyUsdPrices(balances);
  balances.sort((a, b) => b.usdValue - a.usdValue);

  const perChain = new Map<ChainId, number>();
  for (const balance of balances) {
    perChain.set(balance.chain, (perChain.get(balance.chain) ?? 0) + balance.usdValue);
  }
  const chainBreakdown: ChainBreakdown[] = [...perChain.entries()]
    .map(([chain, usdValue]) => ({ chain, usdValue }))
    .sort((a, b) => b.usdValue - a.usdValue);

  const totalUsd = balances.reduce((sum, b) => sum + b.usdValue, 0);

  return { data: { balances, chainBreakdown, totalUsd }, unsupportedChains, errors };
}

async function applyUsdPrices(balances: TokenBalance[]): Promise<TokenBalance[]> {
  if (balances.length === 0) return balances;

  const nativeChains = [...new Set(balances.filter((b) => b.native).map((b) => b.chain))];
  const nativePrices = new Map<ChainId, number | null>();
  await Promise.all(
    nativeChains.map(async (chain) => {
      nativePrices.set(chain, await fetchNativePriceUsd(chain));
    }),
  );

  const erc20Keys = balances
    .filter((b) => !b.native && b.tokenAddress)
    .map((b) => priceKey(b.chain, b.tokenAddress as string));
  const prices = await fetchTokenPrices(erc20Keys);

  return balances.map((balance) => {
    if (balance.native) {
      const price = nativePrices.get(balance.chain) ?? null;
      return {
        ...balance,
        usdValue: price ? toNumber(balance.balanceFormatted) * price : 0,
      };
    }
    const price = prices.get(priceKey(balance.chain, balance.tokenAddress as string))?.price ?? 0;
    return { ...balance, usdValue: toNumber(balance.balanceFormatted) * price };
  });
}

/* ------------------------------------------------------------------ *
 * Transfers
 * ------------------------------------------------------------------ */

async function transfersForChain(
  chain: ChainId,
  address: string,
  fromTimestamp?: number,
): Promise<TransferEvent[]> {
  const transfers = await fetchTokenTransfers(chain, address, 1000);
  const wallet = address.toLowerCase();

  const events: TransferEvent[] = [];
  for (const [index, tx] of transfers.entries()) {
    const timestamp = Number(tx.timeStamp || 0);
    if (!timestamp) continue;
    if (fromTimestamp && timestamp < fromTimestamp) continue;

    const decimals = Number(tx.tokenDecimal ?? 18) || 18;
    const type: TransferEvent["type"] =
      tx.to?.toLowerCase() === wallet ? "receive" : "send";
    events.push({
      id: `${chain}-${tx.hash ?? `${timestamp}-${index}`}-${index}`,
      type,
      asset: tx.tokenSymbol || tx.tokenName || "TOKEN",
      amount: formatAmount(tx.value, decimals),
      usdValue: null,
      chain,
      txHash: tx.hash ?? "",
      timestamp: new Date(timestamp * 1000).toISOString(),
      counterparty: type === "send" ? (tx.from ?? null) : (tx.to ?? null),
      logo: null,
    });
  }

  return events;
}

/** ERC-20 transfers straight from the chain. */
export async function getEtherscanTransfers(
  address: string,
  chainFilter: ChainFilter,
  fromTimestamp?: number,
): Promise<EtherscanResult<TransferEvent[]>> {
  if (!hasEtherscanKey()) {
    return { data: [], unsupportedChains: [], errors: [] };
  }

  const chains = resolveChains(chainFilter).filter(isChainSupportedByPlan);
  const unsupportedChains: ChainId[] = [];
  const errors: string[] = [];

  const settled = await Promise.allSettled(
    chains.map(async (chain) => transfersForChain(chain, address, fromTimestamp)),
  );

  const events: TransferEvent[] = [];
  for (const [index, result] of settled.entries()) {
    if (result.status === "fulfilled") {
      events.push(...result.value);
      continue;
    }
    const reason = result.reason as EtherscanError;
    if (reason?.chainUnavailable) {
      unsupportedChains.push(chains[index]);
    } else {
      errors.push(reason?.message || `Falha ao ler transferências em ${CHAINS[chains[index]].name}.`);
    }
  }

  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { data: events, unsupportedChains, errors };
}