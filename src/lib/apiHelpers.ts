import { isChainFilter } from "@/lib/chains";
import { EtherscanError } from "@/lib/etherscan";
import { MoralisError } from "@/lib/moralis";
import { isValidAddress, normalizeAddress } from "@/lib/validateAddress";
import type { ChainFilter, PeriodFilter } from "@/types/wallet";
import { NextResponse } from "next/server";

export function parseWalletQuery(searchParams: URLSearchParams): {
  address: string;
  chain: ChainFilter;
  period: PeriodFilter;
} {
  const rawAddress = searchParams.get("address") || "";
  if (!isValidAddress(rawAddress)) {
    throw new RouteError("Endereço inválido. Use um endereço EVM 0x…", 400);
  }

  const chainParam = searchParams.get("chain") || "all";
  if (!isChainFilter(chainParam)) {
    throw new RouteError("Rede inválida.", 400);
  }

  const periodParam = (searchParams.get("period") || "30d") as PeriodFilter;
  const allowed: PeriodFilter[] = ["7d", "30d", "90d", "all"];
  if (!allowed.includes(periodParam)) {
    throw new RouteError("Período inválido.", 400);
  }

  return {
    address: normalizeAddress(rawAddress),
    chain: chainParam,
    period: periodParam,
  };
}

export class RouteError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function handleRouteError(error: unknown) {
  if (error instanceof RouteError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof MoralisError) {
    const status = error.status === 401 || error.status === 403 ? 502 : error.status;
    return NextResponse.json(
      { error: error.message, details: "Moralis API" },
      { status: status >= 400 && status < 600 ? status : 502 },
    );
  }
  if (error instanceof EtherscanError) {
    return NextResponse.json(
      { error: error.message, details: "Etherscan API" },
      { status: error.status >= 400 && error.status < 600 ? error.status : 502 },
    );
  }
  console.error(error);
  return NextResponse.json(
    { error: "Erro interno ao processar a carteira." },
    { status: 500 },
  );
}
