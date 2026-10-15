import { getChainName } from "@/lib/chains";
import { formatAmount, formatUsd } from "@/lib/format";
import type { WalletOverview } from "@/types/wallet";

interface OverviewCardsProps {
  overview: WalletOverview;
}

export function OverviewCards({ overview }: OverviewCardsProps) {
  const stats = [
    { label: "Transferências", value: overview.counts.transfers },
    { label: "Trocas", value: overview.counts.swaps },
    { label: "Empréstimos", value: overview.counts.lendingPositions },
    { label: "Pools", value: overview.counts.poolPositions },
    { label: "Liquidações", value: overview.counts.liquidations },
  ];

  return (
    <div className="space-y-6">
      {overview.warnings && overview.warnings.length > 0 ? (
        <div
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]"
          role="status"
        >
          <p className="font-medium text-[var(--foreground)]">Dados parciais</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            {overview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:col-span-2 lg:col-span-1">
          <p className="text-sm text-[var(--muted)]">Patrimônio estimado</p>
          <p className="mt-2 font-display text-3xl tracking-tight text-[var(--foreground)]">
            {formatUsd(overview.totalUsd)}
          </p>
        </div>

        {overview.chainBreakdown.length > 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:col-span-2">
            <p className="mb-3 text-sm text-[var(--muted)]">Por rede</p>
            <div className="flex flex-wrap gap-3">
              {overview.chainBreakdown.map((c) => (
                <div
                  key={c.chain}
                  className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm"
                >
                  <span className="text-[var(--muted)]">{getChainName(c.chain)}</span>
                  <span className="ml-2 font-medium">{formatUsd(c.usdValue)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <p className="text-xs text-[var(--muted)]">{s.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="mb-3 text-sm text-[var(--muted)]">Top tokens</p>
        {overview.balances.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nenhum saldo encontrado.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {overview.balances.slice(0, 10).map((b) => (
              <li
                key={`${b.chain}-${b.tokenAddress || b.symbol}`}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {b.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo} alt="" className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs">
                      {b.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{b.symbol}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {getChainName(b.chain)} · {formatAmount(b.balanceFormatted)}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 tabular-nums">{formatUsd(b.usdValue)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
