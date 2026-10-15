const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";

export class MoralisError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MoralisError";
    this.status = status;
  }
}

function getApiKey(): string {
  const key = process.env.MORALIS_API_KEY;
  if (!key) {
    throw new MoralisError(
      "MORALIS_API_KEY não configurada. Adicione a chave em .env.local.",
      500,
    );
  }
  return key;
}

export async function moralisGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | string[] | undefined>,
  revalidateSeconds = 60,
): Promise<T> {
  const url = new URL(`${MORALIS_BASE}${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, item);
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-API-Key": getApiKey(),
    },
    next: { revalidate: revalidateSeconds },
  });

  if (!res.ok) {
    let details = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) details = body.message;
    } catch {
      // ignore parse errors
    }
    throw new MoralisError(details || "Erro ao consultar Moralis", res.status);
  }

  return res.json() as Promise<T>;
}

/** Raw shapes we care about from Moralis (partial / loose) */
export interface MoralisNetWorth {
  total_networth_usd?: string;
  chains?: Array<{
    chain: string;
    native_balance?: string;
    native_balance_usd?: string;
    token_balance_usd?: string;
    networth_usd?: string;
  }>;
}

export interface MoralisTokenBalance {
  token_address?: string;
  symbol?: string;
  name?: string;
  logo?: string | null;
  balance?: string;
  balance_formatted?: string;
  usd_value?: number | string | null;
  native_token?: boolean;
  possible_spam?: boolean;
  decimals?: number;
}

export interface MoralisHistoryItem {
  hash?: string;
  nonce?: string;
  transaction_index?: string;
  category?: string;
  summary?: string;
  possible_spam?: boolean;
  block_timestamp?: string;
  block_number?: string;
  from_address?: string;
  to_address?: string;
  native_transfers?: Array<{
    from_address?: string;
    to_address?: string;
    value_formatted?: string;
    token_symbol?: string;
    direction?: string;
    value?: string;
  }>;
  erc20_transfers?: Array<{
    token_name?: string;
    token_symbol?: string;
    token_logo?: string | null;
    token_decimals?: string;
    from_address?: string;
    to_address?: string;
    value?: string;
    value_formatted?: string;
    direction?: string;
    address?: string;
  }>;
  nft_transfers?: unknown[];
}

export interface MoralisHistoryResponse {
  result?: MoralisHistoryItem[];
  cursor?: string | null;
  page_size?: number;
}

export interface MoralisDefiPositionToken {
  token_type?: string;
  name?: string;
  symbol?: string;
  decimals?: string | number;
  balance?: string;
  balance_formatted?: string;
  usd_price?: number;
  usd_value?: number;
  logo?: string | null;
}

export interface MoralisDefiPosition {
  protocol_name?: string;
  protocol_id?: string;
  protocol_logo?: string | null;
  protocol_url?: string | null;
  account_data?: {
    net_apy?: number | null;
    health_rate?: number | null;
  };
  position?: {
    label?: string;
    tokens?: MoralisDefiPositionToken[];
    address?: string;
    balance_usd?: number;
    total_unclaimed_usd_value?: number;
  };
}

export interface MoralisDefiPositionsResponse {
  result?: Array<{
    protocol_name?: string;
    protocol_id?: string;
    protocol_logo?: string | null;
    position?: MoralisDefiPosition["position"];
    account_data?: MoralisDefiPosition["account_data"];
    // alternate nesting used by some versions
    positions?: MoralisDefiPosition[];
  }>;
}
