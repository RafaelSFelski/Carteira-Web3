import { WalletDashboard } from "@/components/WalletDashboard";
import { isChainFilter } from "@/lib/chains";
import { isValidAddress } from "@/lib/validateAddress";
import type { ChainFilter } from "@/types/wallet";
import Link from "next/link";

interface PageProps {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ chain?: string }>;
}

export default async function WalletPage({ params, searchParams }: PageProps) {
  const { address } = await params;
  const { chain: chainParam } = await searchParams;

  if (!isValidAddress(address)) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl">Endereço inválido</h1>
        <p className="mt-2 text-[var(--muted)]">
          Use um endereço EVM no formato 0x seguido de 40 caracteres hexadecimais.
        </p>
        <Link href="/" className="mt-6 inline-block text-[var(--accent)] hover:underline">
          Voltar
        </Link>
      </main>
    );
  }

  const chain: ChainFilter =
    chainParam && isChainFilter(chainParam) ? chainParam : "all";

  return (
    <main className="flex-1">
      <WalletDashboard address={address} chain={chain} />
    </main>
  );
}
