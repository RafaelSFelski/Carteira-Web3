import type { ChainId } from "@/types/wallet";

export interface RegistryToken {
  address: string;
  symbol: string;
  decimals: number;
}

/**
 * Tokens checked on every wallet, in addition to the ones discovered from the
 * wallet's own transfer history. Keeps the API call count low while covering the
 * stablecoins / wrapped assets that make up most portfolios.
 */
export const TOKEN_REGISTRY: Record<ChainId, RegistryToken[]> = {
  eth: [
    { address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", symbol: "WETH", decimals: 18 },
    { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC", decimals: 6 },
    { address: "0xdac17f958d2ee523a2206206994597c13d831ec7", symbol: "USDT", decimals: 6 },
    { address: "0x6b175474e89094c44da98b954eedeac495271d0f", symbol: "DAI", decimals: 18 },
    { address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", symbol: "WBTC", decimals: 8 },
  ],
  base: [
    { address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", symbol: "USDC", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
    { address: "0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22", symbol: "cbETH", decimals: 18 },
    { address: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb", symbol: "DAI", decimals: 18 },
  ],
  arbitrum: [
    { address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", symbol: "USDC", decimals: 6 },
    { address: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", symbol: "USDT", decimals: 6 },
    { address: "0x82af49447d8a07e3bd95bd0d56f35241523fab1", symbol: "WETH", decimals: 18 },
    { address: "0x912ce59144191c1204e64559fe8253a0e49e6548", symbol: "ARB", decimals: 18 },
  ],
  optimism: [
    { address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", symbol: "USDC", decimals: 6 },
    { address: "0x7f5c764cbc14f9669b88837ca1490cca17c31607", symbol: "USDC.e", decimals: 6 },
    { address: "0x94b008aa00579c1307b0ef2c873ad8f0b96b7b5fb", symbol: "USDT", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  ],
  polygon: [
    { address: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", symbol: "USDC.e", decimals: 6 },
    { address: "0x3c499c542cef5e4791ebc7b65ea488227c386c25", symbol: "USDC", decimals: 6 },
    { address: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", symbol: "USDT", decimals: 6 },
    { address: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0", symbol: "WETH", decimals: 18 },
  ],
  bsc: [
    { address: "0x55d398326f99059ff775485246999027b3197955", symbol: "USDT", decimals: 18 },
    { address: "0xe9e7cea3dedca5984780bafc599bd69add087d56", symbol: "BUSD", decimals: 18 },
    { address: "0x8ac76a51cc950d9822d68b83d1ad61b2a88d0d5ff", symbol: "USDC", decimals: 18 },
    { address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c", symbol: "WBNB", decimals: 18 },
  ],
  avalanche: [
    { address: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e", symbol: "USDC", decimals: 6 },
    { address: "0xc7198437980c041c805a1edcba50c1ce5db95118", symbol: "USDT", decimals: 6 },
    { address: "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab", symbol: "WETH.e", decimals: 18 },
    { address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7", symbol: "WAVAX", decimals: 18 },
  ],
};