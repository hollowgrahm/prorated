// Wagmi Configuration for Prorated Protocol
import { http } from 'wagmi'
import { defineChain } from 'viem'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { env } from './env'

// Define Anvil Local Chain
export const anvilLocal = defineChain({
  id: env.chainId,
  name: 'Anvil Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [env.rpcUrl],
    },
  },
  blockExplorers: {
    default: {
      name: 'Local Explorer',
      url: 'http://localhost:8545',
    },
  },
  testnet: true,
})

// RainbowKit Configuration
export const config = getDefaultConfig({
  appName: 'Prorated Protocol',
  projectId: 'prorated-demo', // For demo purposes
  chains: [anvilLocal],
  transports: {
    [anvilLocal.id]: http(env.rpcUrl),
  },
  ssr: true, // Enable server-side rendering support
})

// Re-export types for convenience
export type { Config } from 'wagmi'
export { type Chain } from 'viem'
