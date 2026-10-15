import {
  ActivityTable,
  ChainBadge,
  formatAmount,
  formatUsd,
} from "@/components/ActivityTable";
import type { LendingPosition, PoolPosition } from "@/types/wallet";

interface PositionsPanelProps {
  lending: LendingPosition[];
  pools: PoolPosition[];
  mode: "lending" | "pools";
}

export function PositionsPanel({ lending, pools, mode }: PositionsPanelProps) {
  if (mode === "lending") {
    return (
      <ActivityTable
        rows={lending}
        emptyMessage="Nenhuma posição de empréstimo encontrada."
        columns={[
          {
            key: "protocol",
            header: "Protocolo",
            searchValue: (r) => r.protocol,
            render: (r) => (
              <div className="flex items-center gap-2">
                {r.protocolLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.protocolLogo} alt="" className="h-5 w-5 rounded-full" />
                ) : null}
                <span className="font-medium">{r.protocol}</span>
              </div>
            ),
          },
          {
            key: "supply",
            header: "Supply",
            searchValue: (r) => r.supplyAssets.map((a) => a.symbol).join(" "),
            render: (r) =>
              r.supplyAssets.length
                ? r.supplyAssets
                    .map((a) => `${formatAmount(a.amount)} ${a.symbol}`)
                    .join(", ")
                : "—",
          },
          {
            key: "borrow",
            header: "Borrow",
            searchValue: (r) => r.borrowAssets.map((a) => a.symbol).join(" "),
            render: (r) =>
              r.borrowAssets.length
                ? r.borrowAssets
                    .map((a) => `${formatAmount(a.amount)} ${a.symbol}`)
                    .join(", ")
                : "—",
          },
          {
            key: "health",
            header: "Health",
            render: (r) =>
              r.healthFactor != null ? r.healthFactor.toFixed(2) : "—",
          },
          {
            key: "usd",
            header: "USD",
            render: (r) => formatUsd(r.usdValue),
          },
          {
            key: "chain",
            header: "Rede",
            searchValue: (r) => r.chain,
            render: (r) => <ChainBadge chain={r.chain} />,
          },
        ]}
      />
    );
  }

  return (
    <ActivityTable
      rows={pools}
      emptyMessage="Nenhuma posição em pool encontrada."
      columns={[
        {
          key: "protocol",
          header: "Protocolo",
          searchValue: (r) => `${r.protocol} ${r.label}`,
          render: (r) => (
            <div>
              <p className="font-medium">{r.protocol}</p>
              <p className="text-xs text-[var(--muted)]">{r.label}</p>
            </div>
          ),
        },
        {
          key: "assets",
          header: "Ativos",
          searchValue: (r) => r.assets.map((a) => a.symbol).join(" "),
          render: (r) =>
            r.assets.length
              ? r.assets.map((a) => `${formatAmount(a.amount)} ${a.symbol}`).join(" / ")
              : "—",
        },
        {
          key: "usd",
          header: "USD",
          render: (r) => formatUsd(r.usdValue),
        },
        {
          key: "chain",
          header: "Rede",
          searchValue: (r) => r.chain,
          render: (r) => <ChainBadge chain={r.chain} />,
        },
      ]}
    />
  );
}
