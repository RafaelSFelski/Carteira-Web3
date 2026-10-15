"use client";

import {
  ActivityTable,
  ChainBadge,
  formatAmount,
  formatDate,
  formatUsd,
  TxLink,
} from "@/components/ActivityTable";
import { AddressForm } from "@/components/AddressForm";
import { OverviewCards } from "@/components/OverviewCards";
import { PositionsPanel } from "@/components/PositionsPanel";
import { shortenAddress } from "@/lib/validateAddress";
import type {
  ApiErrorBody,
  ChainFilter,
  LendingPosition,
  LiquidationEvent,
  PeriodFilter,
  PoolPosition,
  SwapEvent,
  TransferEvent,
  WalletOverview,
} from "@/types/wallet";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type TabId =
  | "overview"
  | "transfers"
  | "swaps"
  | "lending"
  | "pools"
  | "liquidations";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transfers", label: "Transferências" },
  { id: "swaps", label: "Trocas" },
  { id: "lending", label: "Empréstimos" },
  { id: "pools", label: "Pools" },
  { id: "liquidations", label: "Liquidações" },
];

const PERIODS: { id: PeriodFilter; label: string }[] = [
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "all", label: "Tudo" },
];

interface WalletDashboardProps {
  address: string;
  chain: ChainFilter;
}

export function WalletDashboard({ address, chain }: WalletDashboardProps) {
  const [tab, setTab] = useState<TabId>("overview");
  const [period, setPeriod] = useState<PeriodFilter>("30d");

  const [overview, setOverview] = useState<WalletOverview | null>(null);
  const [transfers, setTransfers] = useState<TransferEvent[]>([]);
  const [swaps, setSwaps] = useState<SwapEvent[]>([]);
  const [lending, setLending] = useState<LendingPosition[]>([]);
  const [pools, setPools] = useState<PoolPosition[]>([]);
  const [liquidations, setLiquidations] = useState<LiquidationEvent[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sectionLoading, setSectionLoading] = useState(false);

  const qs = useCallback(
    (extra?: Record<string, string>) => {
      const params = new URLSearchParams({
        address,
        chain,
        period,
        ...extra,
      });
      return params.toString();
    },
    [address, chain, period],
  );

  async function fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url);
    const body = (await res.json()) as T & ApiErrorBody;
    if (!res.ok) {
      throw new Error(body.error || "Falha ao carregar dados");
    }
    return body;
  }

  useEffect(() => {
    let cancelled = false;
    async function loadOverview() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchJson<WalletOverview>(
          `/api/wallet/overview?${qs()}`,
        );
        if (!cancelled) setOverview(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro desconhecido");
          setOverview(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  useEffect(() => {
    if (tab === "overview") return;
    let cancelled = false;

    async function loadTab() {
      setSectionLoading(true);
      setError(null);
      try {
        if (tab === "transfers") {
          const data = await fetchJson<{ items: TransferEvent[] }>(
            `/api/wallet/transfers?${qs()}`,
          );
          if (!cancelled) setTransfers(data.items);
        } else if (tab === "swaps") {
          const data = await fetchJson<{ items: SwapEvent[] }>(
            `/api/wallet/swaps?${qs()}`,
          );
          if (!cancelled) setSwaps(data.items);
        } else if (tab === "liquidations") {
          const data = await fetchJson<{ items: LiquidationEvent[] }>(
            `/api/wallet/liquidations?${qs()}`,
          );
          if (!cancelled) setLiquidations(data.items);
        } else if (tab === "lending" || tab === "pools") {
          const data = await fetchJson<{
            lending: LendingPosition[];
            pools: PoolPosition[];
          }>(`/api/wallet/positions?${qs()}`);
          if (!cancelled) {
            setLending(data.lending);
            setPools(data.pools);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro desconhecido");
        }
      } finally {
        if (!cancelled) setSectionLoading(false);
      }
    }

    void loadTab();
    return () => {
      cancelled = true;
    };
  }, [tab, qs]);

  const showPeriod = tab === "transfers" || tab === "swaps" || tab === "liquidations";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
            ← Nova consulta
          </Link>
          <h1 className="mt-2 font-display text-2xl tracking-tight sm:text-3xl">
            Carteira {shortenAddress(address, 6)}
          </h1>
          <p className="mt-1 font-mono text-xs text-[var(--muted)] break-all">{address}</p>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <AddressForm initialAddress={address} initialChain={chain} compact />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-lg bg-[var(--surface-2)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                tab === t.id
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {showPeriod ? (
          <div className="flex gap-1 rounded-lg bg-[var(--surface-2)] p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  period === p.id
                    ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "text-[var(--muted)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div
          className="mb-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {loading || (sectionLoading && tab !== "overview") ? (
        <SkeletonBlock />
      ) : tab === "overview" && overview ? (
        <OverviewCards overview={overview} />
      ) : tab === "transfers" ? (
        <ActivityTable
          rows={transfers}
          emptyMessage="Nenhuma transferência no período."
          columns={[
            {
              key: "type",
              header: "Tipo",
              searchValue: (r) => r.type,
              render: (r) => (
                <span
                  className={
                    r.type === "receive" ? "text-[var(--success)]" : "text-[var(--danger)]"
                  }
                >
                  {r.type === "receive" ? "Recebido" : "Enviado"}
                </span>
              ),
            },
            {
              key: "asset",
              header: "Ativo",
              searchValue: (r) => `${r.asset} ${r.amount}`,
              render: (r) => (
                <span>
                  {formatAmount(r.amount)} {r.asset}
                </span>
              ),
            },
            {
              key: "time",
              header: "Data",
              searchValue: (r) => r.timestamp,
              render: (r) => formatDate(r.timestamp),
            },
            {
              key: "chain",
              header: "Rede",
              searchValue: (r) => r.chain,
              render: (r) => <ChainBadge chain={r.chain} />,
            },
            {
              key: "tx",
              header: "Tx",
              searchValue: (r) => r.txHash,
              render: (r) => <TxLink chain={r.chain} hash={r.txHash} />,
            },
          ]}
        />
      ) : tab === "swaps" ? (
        <ActivityTable
          rows={swaps}
          emptyMessage="Nenhuma troca no período."
          columns={[
            {
              key: "pair",
              header: "Par",
              searchValue: (r) => `${r.tokenIn} ${r.tokenOut} ${r.protocol || ""}`,
              render: (r) => (
                <span>
                  {formatAmount(r.amountIn)} {r.tokenIn} → {formatAmount(r.amountOut)}{" "}
                  {r.tokenOut}
                </span>
              ),
            },
            {
              key: "protocol",
              header: "Protocolo",
              searchValue: (r) => r.protocol || "",
              render: (r) => r.protocol || "—",
            },
            {
              key: "usd",
              header: "USD",
              render: (r) => formatUsd(r.usdValue),
            },
            {
              key: "time",
              header: "Data",
              render: (r) => formatDate(r.timestamp),
            },
            {
              key: "chain",
              header: "Rede",
              searchValue: (r) => r.chain,
              render: (r) => <ChainBadge chain={r.chain} />,
            },
            {
              key: "tx",
              header: "Tx",
              searchValue: (r) => r.txHash,
              render: (r) => <TxLink chain={r.chain} hash={r.txHash} />,
            },
          ]}
        />
      ) : tab === "lending" ? (
        <PositionsPanel lending={lending} pools={pools} mode="lending" />
      ) : tab === "pools" ? (
        <PositionsPanel lending={lending} pools={pools} mode="pools" />
      ) : tab === "liquidations" ? (
        <ActivityTable
          rows={liquidations}
          emptyMessage="Nenhuma liquidação no período."
          columns={[
            {
              key: "protocol",
              header: "Protocolo",
              searchValue: (r) => `${r.protocol || ""} ${r.summary || ""}`,
              render: (r) => r.protocol || r.summary || "—",
            },
            {
              key: "collateral",
              header: "Colateral",
              searchValue: (r) => r.collateral || "",
              render: (r) => r.collateral || "—",
            },
            {
              key: "debt",
              header: "Dívida",
              searchValue: (r) => r.debt || "",
              render: (r) => r.debt || "—",
            },
            {
              key: "time",
              header: "Data",
              render: (r) => formatDate(r.timestamp),
            },
            {
              key: "chain",
              header: "Rede",
              searchValue: (r) => r.chain,
              render: (r) => <ChainBadge chain={r.chain} />,
            },
            {
              key: "tx",
              header: "Tx",
              searchValue: (r) => r.txHash,
              render: (r) => <TxLink chain={r.chain} hash={r.txHash} />,
            },
          ]}
        />
      ) : (
        <p className="text-sm text-[var(--muted)]">Sem dados para exibir.</p>
      )}
    </div>
  );
}

function SkeletonBlock() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-xl bg-[var(--surface-2)]" />
        <div className="h-28 rounded-xl bg-[var(--surface-2)] sm:col-span-2" />
      </div>
      <div className="h-64 rounded-xl bg-[var(--surface-2)]" />
    </div>
  );
}
