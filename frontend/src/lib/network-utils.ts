// Network utilities for dynamic network handling
import { createPublicClient, http, fallback } from 'viem'
import { NETWORK_CONFIG } from './contracts-config'
import { anvilLocal, hyperliquidTestnet } from './wagmi'
import { env } from './env'

// Get Hyperliquid testnet RPC endpoints from environment
function getHyperliquidRpcs() {
  const rpcs = [NETWORK_CONFIG.rpcUrl] // Primary RPC from config
  
  // Add backup RPC if available in environment
  if (env.rpcUrlBackup) {
    rpcs.push(env.rpcUrlBackup)
  }
  
  return rpcs
}

// Get the current target network based on config
export function getCurrentNetwork() {
  return NETWORK_CONFIG.chainId === 998 ? hyperliquidTestnet : anvilLocal
}

// Get the current RPC URL based on config (returns primary RPC)
export function getCurrentRpcUrl() {
  return NETWORK_CONFIG.chainId === 998 
    ? getHyperliquidRpcs()[0] 
    : env.rpcUrl
}

// Get all RPC URLs for the current network
export function getCurrentRpcUrls() {
  return NETWORK_CONFIG.chainId === 998 
    ? getHyperliquidRpcs() 
    : [env.rpcUrl]
}

// Create a public client for the current network with fallback support
export function createCurrentNetworkClient() {
  const network = getCurrentNetwork()
  
  if (NETWORK_CONFIG.chainId === 998) {
    const rpcs = getHyperliquidRpcs()
    
    if (rpcs.length > 1) {
      // Use fallback transport for Hyperliquid with multiple RPCs
      return createPublicClient({
        chain: network,
        transport: fallback(
          rpcs.map(rpc => http(rpc)),
          { rank: false } // Don't rank by speed, use in order
        )
      })
    } else {
      // Use single RPC if no backup available
      return createPublicClient({
        chain: network,
        transport: http(rpcs[0])
      })
    }
  } else {
    // Use single RPC for Anvil
    return createPublicClient({
      chain: network,
      transport: http(env.rpcUrl)
    })
  }
}

// Test RPC connectivity (useful for debugging)
export async function testRpcConnectivity() {
  const rpcs = getCurrentRpcUrls()
  const results = []
  
  for (const rpc of rpcs) {
    try {
      const client = createPublicClient({
        chain: getCurrentNetwork(),
        transport: http(rpc)
      })
      
      const startTime = Date.now()
      const chainId = await client.getChainId()
      const responseTime = Date.now() - startTime
      
      results.push({
        url: rpc,
        status: 'healthy',
        chainId,
        responseTime,
        error: null
      })
    } catch (error) {
      results.push({
        url: rpc,
        status: 'error',
        chainId: null,
        responseTime: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
  
  return results
}
