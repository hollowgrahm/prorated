// Wagmi Configuration for Prorated Protocol
import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { injected, metaMask } from 'wagmi/connectors'
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

// Wagmi Configuration
export const config = createConfig({
  chains: [anvilLocal],
  connectors: [
    injected(),
    metaMask(),
    // Note: walletConnect requires a projectId for production
    // walletConnect({ projectId: 'your-project-id' }),
  ],
  transports: {
    [anvilLocal.id]: http(env.rpcUrl),
  },
  ssr: true, // Enable server-side rendering support
  // Ensure read calls work without connected wallet
  multiInjectedProviderDiscovery: false,
})

// Re-export types for convenience
export type { Config } from 'wagmi'
export { type Chain } from 'viem'
