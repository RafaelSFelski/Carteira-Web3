# Análise Carteira Web3

Dashboard Next.js para consultar uma carteira EVM por endereço e consolidar **transferências**, **trocas (swaps)**, **empréstimos**, **pools** e **liquidações**, com visão multi-chain ou filtro por uma rede.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- [Etherscan API V2](https://docs.etherscan.io) — saldos e transferências lidos direto da chain
- [DefiLlama Prices](https://coins.llama.fi) — preços em USD (grátis, sem chave)
- [Moralis Web3 Data API](https://docs.moralis.com/) — histórico decodificado e posições DeFi

## Pré-requisitos

1. Node.js 20+
2. Conta e API key em [Moralis](https://moralis.io/) — usado **apenas** para swaps/lending/pools/liquidações
3. API key gratuita em [etherscan.io/myapikey](https://etherscan.io/myapikey) — usado para saldos e transferências

## Setup

```bash
npm install
cp .env.example .env.local
```

Edite `.env.local` e preencha:

```
MORALIS_API_KEY=sua_chave_aqui
ETHERSCAN_API_KEY=sua_chave_aqui
```

As chaves ficam **somente no servidor** (route handlers). Nunca use `NEXT_PUBLIC_` para elas.

## Desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000), cole um endereço `0x…` e escolha a rede (`Todas` ou uma chain).

## Produção

```bash
npm run build
npm start
```

Na Vercel, configure `MORALIS_API_KEY` nas Environment Variables do projeto.

## Redes suportadas (MVP)

Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, Avalanche.

## API interna

| Rota | Descrição |
|------|-----------|
| `GET /api/wallet/overview?address=&chain=` | Patrimônio, tokens e contagens |
| `GET /api/wallet/transfers?address=&chain=&period=` | Transferências |
| `GET /api/wallet/swaps?address=&chain=&period=` | Swaps |
| `GET /api/wallet/positions?address=&chain=` | Lending + pools |
| `GET /api/wallet/liquidations?address=&chain=&period=` | Liquidações |

`chain`: `all` \| `eth` \| `base` \| `arbitrum` \| `optimism` \| `polygon` \| `bsc` \| `avalanche`  
`period`: `7d` \| `30d` \| `90d` \| `all`

Respostas são cacheadas por ~60s (`fetch` com `revalidate`).

## Fontes de dados

| Dado | Fonte | Observação |
|------|-------|------------|
| Saldos (nativo + ERC-20) | Etherscan API V2 | tokens descobertos pelo histórico + registro curado por rede |
| Preços em USD | DefiLlama Prices | grátis; tokens sem preço ficam sem valor |
| Transferências | Etherscan API V2 (`tokentx`) | até 1.000 registros por requisição |
| Trocas / empréstimos / pools / liquidações | Moralis | único dado que exige provider pago |

### Limites do plano gratuito da Etherscan

O plano free tem **3 req/s**, **100.000 req/dia** e cobre **apenas um subconjunto das redes**
(hoje: Ethereum, Arbitrum e Polygon). Redes fora da cobertura são detectadas automaticamente,
omitidas do resultado e listadas como aviso no overview — o app continua funcionando.

Para as demais redes (Base, Optimism, BNB Chain, Avalanche) é necessário um plano pago
(Lite) ou outro provedor de RPC com free tier.

## Fora do escopo atual

- Conectar wallet (WalletConnect / MetaMask)
- Solana
- Alertas de health factor / export CSV
