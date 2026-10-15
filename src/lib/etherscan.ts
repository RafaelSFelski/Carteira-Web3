import { CHAINS } from "@/lib/chains";
import type { ChainId } from "@/types/wallet";

const ETHERSCAN_BASE = "https://api.etherscan.io/v2/api";

/** Free tier allows 3 calls/second (see docs.etherscan.io/rate-limits). */
const MIN_INTERVAL_MS = 340;

/** Free tier returns at most 1.000 records per request. */
const MAX_PAGE_SIZE = 1000;

export class EtherscanError extends Error {
  status: number;
  /** True when the chain is not covered by the current API plan. */
  chainUnavailable: boolean;

  constructor(message: string, status: number, chainUnavailable = false) {
    super(message);
    this.name = "EtherscanError";
    this.status = status;
    this.chainUnavailable = chainUnavailable;
  }
}

export function hasEtherscanKey(): boolean {
  return Boolean(process.env.ETHERSCAN_API_KEY?.trim());
}

function getApiKey(): string {
  const key = process.env.ETHERSCAN_API_KEY?.trim();
  if (!key) {
    throw new EtherscanError(
      "ETHERSCAN_API_KEY não configurada. Adicione a chave em .env.local.",
      500,
    );
  }
  return key;
}

/** Chains already known to be outside the plan coverage, so we stop calling them. */
const unavailableChains = new Set<ChainId>();

export function isChainSupportedByPlan(chain: ChainId): boolean {
  return !unavailableChains.has(chain);
}

export function resetPlanAvailabilityCache(): void {
  unavailableChains.clear();
}

/**
 * Serializes requests with a fixed spacing so we never exceed the free tier
 * rate limit, no matter how many chains/tokens we fan out to.
 */
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastRequestAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

interface EtherscanEnvelope<T> {
  status: string;
  message: string;
  result: T;
}

const EMPTY_RESULT = /no (transactions|records|transfers|blocks|token transfers)/i;
const PLAN_LIMIT = /free api access is not supported for this chain/i;

function isEmptyResult(message: string): boolean {
  return EMPTY_RESULT.test(message);
}

async function etherscanQuery<T>(
  chain: ChainId,
  params: Record<string, string | number | undefined>,
  revalidateSeconds = 60,
): Promise<T> {
  const meta = CHAINS[chain];
  const url = new URL(ETHERSCAN_BASE);

  url.searchParams.set("chainid", String(meta.chainId));
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("apikey", getApiKey());

  return schedule(async () => {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: revalidateSeconds },
    });

    if (!res.ok) {
      throw new EtherscanError(
        `Etherscan respondeu ${res.status} (${chain}).`,
        res.status >= 400 && res.status < 600 ? res.status : 502,
      );
    }

    const body = (await res.json()) as EtherscanEnvelope<T>;

    if (body.status === "1") return body.result;

    const message = typeof body.result === "string" && body.result ? body.result : body.message;

    if (isEmptyResult(message)) return [] as T;

    if (PLAN_LIMIT.test(message)) {
      unavailableChains.add(chain);
      throw new EtherscanError(
        `A rede ${meta.name} não está incluída no plano atual da Etherscan.`,
        403,
        true,
      );
    }

    if (/rate limit/i.test(message)) {
      throw new EtherscanError("Limite de requisições da Etherscan atingido.", 429);
    }

    throw new EtherscanError(message || "Erro ao consultar a Etherscan", 502);
  });
}

/* ------------------------------------------------------------------ *
 * Endpoint payloads (partial — only what we consume)
 * ------------------------------------------------------------------ */

export interface EtherscanNativeBalance {
  account?: string;
  balance?: string;
}

export interface EtherscanNativePrice {
  ethbtc?: string;
  ethbtc_timestamp?: string;
  ethusd?: string;
  ethusd_timestamp?: string;
}

export interface EtherscanTokenTx {
  blockNumber?: string;
  timeStamp?: string;
  hash?: string;
  from?: string;
  to?: string;
  /** Amount in the token's smallest unit. */
  value?: string;
  contractAddress?: string;
  tokenName?: string;
  tokenSymbol?: string;
  tokenDecimal?: string;
}

/* ------------------------------------------------------------------ *
 * Endpoints
 * ------------------------------------------------------------------ */

/** Native (gas token) balance in wei. */
export async function fetchNativeBalance(
  chain: ChainId,
  address: string,
  revalidateSeconds = 60,
): Promise<string> {
  // V2 returns the balance as a plain string; some deployments wrap it in an object.
  const result = await etherscanQuery<string | EtherscanNativeBalance>(
    chain,
    { module: "account", action: "balance", address, tag: "latest" },
    revalidateSeconds,
  );
  if (typeof result === "string") return result;
  return result.balance ?? "0";
}

/** Price of the chain's native token in USD. */
export async function fetchNativePriceUsd(
  chain: ChainId,
  revalidateSeconds = 300,
): Promise<number | null> {
  try {
    const result = await etherscanQuery<EtherscanNativePrice>(
      chain,
      { module: "stats", action: "ethprice" },
      revalidateSeconds,
    );
    const price = Number(result.ethusd);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    // Price is optional — a failure here must not break the balance read.
    return null;
  }
}

/** ERC-20 balance in the token's smallest unit, or null when the token has no balance. */
export async function fetchTokenBalanceRaw(
  chain: ChainId,
  address: string,
  tokenAddress: string,
  revalidateSeconds = 60,
): Promise<string | null> {
  const result = await etherscanQuery<string | EtherscanTokenTx[]>(
    chain,
    {
      module: "account",
      action: "tokenbalance",
      contractaddress: tokenAddress,
      address,
      tag: "latest",
    },
    revalidateSeconds,
  );
  if (typeof result === "string") return result;
  return null;
}

/**
 * ERC-20 transfers involving `address`, newest first.
 * `pageSize` is capped at 1.000 (free tier limit).
 */
export async function fetchTokenTransfers(
  chain: ChainId,
  address: string,
  pageSize = MAX_PAGE_SIZE,
  revalidateSeconds = 60,
): Promise<EtherscanTokenTx[]> {
  const result = await etherscanQuery<EtherscanTokenTx[]>(
    chain,
    {
      module: "account",
      action: "tokentx",
      address,
      page: 1,
      offset: Math.min(pageSize, MAX_PAGE_SIZE),
      sort: "desc",
    },
    revalidateSeconds,
  );
  return Array.isArray(result) ? result : [];
}