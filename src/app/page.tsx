import { AddressForm } from "@/components/AddressForm";

export default function HomePage() {
  return (
    <main className="relative flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="mb-3 text-sm font-medium tracking-wide text-[var(--accent)]">
          Análise Carteira Web3
        </p>
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Consolide a atividade on-chain de qualquer carteira
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--muted)] sm:text-lg">
          Cole um endereço EVM e veja transferências, trocas, empréstimos, pools e
          liquidações em múltiplas redes — ou filtre por uma só.
        </p>

        <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-5 backdrop-blur sm:p-6">
          <AddressForm />
        </div>
      </div>
    </main>
  );
}
