"use client";

import { getChainName, getExplorerTx } from "@/lib/chains";
import { formatAmount, formatDate, formatUsd } from "@/lib/format";
import { shortenAddress } from "@/lib/validateAddress";
import type { ChainId } from "@/types/wallet";
import { type ReactNode, useMemo, useState } from "react";

export interface ActivityColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  searchValue?: (row: T) => string;
}

interface ActivityTableProps<T extends { id: string }> {
  rows: T[];
  columns: ActivityColumn<T>[];
  emptyMessage?: string;
  pageSize?: number;
}

export function ActivityTable<T extends { id: string }>({
  rows,
  columns,
  emptyMessage = "Nenhum registro encontrado.",
  pageSize = 15,
}: ActivityTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        const v = col.searchValue?.(row);
        return v?.toLowerCase().includes(q);
      }),
    );
  }, [rows, query, columns]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Buscar…"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none ring-[var(--accent)] focus:ring-2 sm:max-w-xs"
        />
        <p className="text-xs text-[var(--muted)]">
          {filtered.length} registro{filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      {slice.length === 0 ? (
        <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-8 text-center text-sm text-[var(--muted)]">
          {emptyMessage}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-3 font-medium">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {slice.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--surface-2)]/60">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 align-middle">
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-md bg-[var(--surface-2)] px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-[var(--muted)]">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="rounded-md bg-[var(--surface-2)] px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function TxLink({ chain, hash }: { chain: ChainId; hash: string }) {
  return (
    <a
      href={getExplorerTx(chain, hash)}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-xs text-[var(--accent)] hover:underline"
    >
      {shortenAddress(hash, 6)}
    </a>
  );
}

export function ChainBadge({ chain }: { chain: ChainId }) {
  return (
    <span className="rounded bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--muted)]">
      {getChainName(chain)}
    </span>
  );
}

export { formatAmount, formatDate, formatUsd };
