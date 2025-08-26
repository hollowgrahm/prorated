// Network utilities for dynamic network handling
import { createPublicClient, http } from 'viem'
import { NETWORK_CONFIG } from './contracts-config'
import { anvilLocal, hyperliquidTestnet } from './wagmi'
import { env } from './env'

// Get the current target network based on config
export function getCurrentNetwork() {
  return NETWORK_CONFIG.chainId === 998 ? hyperliquidTestnet : anvilLocal
}

// Get the current RPC URL based on config
export function getCurrentRpcUrl() {
  return NETWORK_CONFIG.chainId === 998 
    ? 'https://rpc.hyperliquid-testnet.xyz/evm' 
    : env.rpcUrl
}

// Create a public client for the current network
export function createCurrentNetworkClient() {
  return createPublicClient({
    chain: getCurrentNetwork(),
    transport: http(getCurrentRpcUrl())
  })
}
