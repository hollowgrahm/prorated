'use client'

import { useReadContract, useAccount } from 'wagmi'
import { Address } from 'viem'
import { getProratedPoolConfig } from '@/lib/contracts'

export interface DeploymentStatus {
  tokenAddress: Address | null
  pairAddress: Address | null
  veNFTAddress: Address | null
  governorAddress: Address | null
  treasuryAddress: Address | null
  prolendPair80: Address | null
  prolendPair20: Address | null
  hasReachedMinimum: boolean
  isLoading: boolean
  error: Error | null
}

export interface DeploymentStepStatus {
  id: string
  status: 'pending' | 'ready' | 'deploying' | 'completed' | 'failed'
  txHash?: string
  address?: Address
}

/**
 * Hook to read the current deployment status of a pool from the blockchain
 */
export function useDeploymentStatus(poolAddress: Address): DeploymentStatus {
  const { isConnected } = useAccount()
  
  // Read pool data to get all deployment addresses
  const { 
    data: poolData, 
    isLoading, 
    error,
    refetch 
  } = useReadContract({
    ...getProratedPoolConfig(poolAddress),
    functionName: 'getPoolData',
    query: {
      enabled: !!poolAddress && isConnected,
      refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    },
  })

  // Check if pool has reached minimum funding
  const { data: hasReachedMinimum } = useReadContract({
    ...getProratedPoolConfig(poolAddress),
    functionName: 'hasReachedMinimum',
    query: {
      enabled: !!poolAddress && isConnected,
      refetchInterval: 5000,
    },
  })

  if (!poolData) {
    return {
      tokenAddress: null,
      pairAddress: null,
      veNFTAddress: null,
      governorAddress: null,
      treasuryAddress: null,
      prolendPair80: null,
      prolendPair20: null,
      hasReachedMinimum: false,
      isLoading,
      error: error as Error | null,
    }
  }

  // Extract addresses from pool data
  // poolData structure: [config, totalContributions, totalShares, minTotalContributions, 
  //                     proratedToken, proswapPair, proratedVeNFT, proratedGovernor, 
  //                     proratedTreasury, prolendPair80, prolendPair20]
  const [
    config,
    totalContributions,
    totalShares,
    minTotalContributions,
    proratedToken,
    proswapPair,
    proratedVeNFT,
    proratedGovernor,
    proratedTreasury,
    prolendPair80,
    prolendPair20,
  ] = poolData

  // Convert zero addresses to null
  const zeroAddress = '0x0000000000000000000000000000000000000000'
  
  return {
    tokenAddress: proratedToken !== zeroAddress ? proratedToken : null,
    pairAddress: proswapPair !== zeroAddress ? proswapPair : null,
    veNFTAddress: proratedVeNFT !== zeroAddress ? proratedVeNFT : null,
    governorAddress: proratedGovernor !== zeroAddress ? proratedGovernor : null,
    treasuryAddress: proratedTreasury !== zeroAddress ? proratedTreasury : null,
    prolendPair80: prolendPair80 !== zeroAddress ? prolendPair80 : null,
    prolendPair20: prolendPair20 !== zeroAddress ? prolendPair20 : null,
    hasReachedMinimum: hasReachedMinimum ?? false,
    isLoading,
    error: error as Error | null,
  }
}

/**
 * Calculate deployment step statuses based on current blockchain state
 */
export function useDeploymentSteps(poolAddress: Address, poolStatus?: string): DeploymentStepStatus[] {
  const deployment = useDeploymentStatus(poolAddress)
  
  if (deployment.isLoading) {
    return [
      { id: 'token', status: 'pending' },
      { id: 'pair', status: 'pending' },
      { id: 'liquidity', status: 'pending' },
      { id: 'venft', status: 'pending' },
      { id: 'governor', status: 'pending' },
      { id: 'treasury', status: 'pending' },
      { id: 'prolend', status: 'pending' },
    ]
  }

  // For pools that haven't reached minimum funding, all steps should be pending
  // BUT: If poolStatus indicates deploying, we know they've reached the goal
  const isReadyForDeployment = deployment.hasReachedMinimum || 
                              poolStatus === 'deploying'
  
  if (!isReadyForDeployment) {
    return [
      { id: 'token', status: 'pending' },
      { id: 'pair', status: 'pending' },
      { id: 'liquidity', status: 'pending' },
      { id: 'venft', status: 'pending' },
      { id: 'governor', status: 'pending' },
      { id: 'treasury', status: 'pending' },
      { id: 'prolend', status: 'pending' },
    ]
  }

  // Determine step statuses based on deployment addresses
  const steps: DeploymentStepStatus[] = []

  // Token deployment
  if (deployment.tokenAddress) {
    steps.push({ 
      id: 'token', 
      status: 'completed',
      address: deployment.tokenAddress 
    })
  } else {
    steps.push({ id: 'token', status: 'ready' })
  }

  // Pair deployment (requires token)
  if (deployment.pairAddress) {
    steps.push({ 
      id: 'pair', 
      status: 'completed',
      address: deployment.pairAddress 
    })
  } else if (deployment.tokenAddress) {
    steps.push({ id: 'pair', status: 'ready' })
  } else {
    steps.push({ id: 'pair', status: 'pending' })
  }

  // Liquidity deployment (requires pair, detected by checking if LP tokens exist)
  // Note: We'll need to add a check for liquidity deployment status
  if (deployment.pairAddress) {
    steps.push({ id: 'liquidity', status: 'ready' })
  } else {
    steps.push({ id: 'liquidity', status: 'pending' })
  }

  // veNFT deployment (requires liquidity)
  if (deployment.veNFTAddress) {
    steps.push({ 
      id: 'venft', 
      status: 'completed',
      address: deployment.veNFTAddress 
    })
  } else if (deployment.pairAddress) { // Assume liquidity is ready if pair exists
    steps.push({ id: 'venft', status: 'ready' })
  } else {
    steps.push({ id: 'venft', status: 'pending' })
  }

  // Governor deployment (requires veNFT)
  if (deployment.governorAddress) {
    steps.push({ 
      id: 'governor', 
      status: 'completed',
      address: deployment.governorAddress 
    })
  } else if (deployment.veNFTAddress) {
    steps.push({ id: 'governor', status: 'ready' })
  } else {
    steps.push({ id: 'governor', status: 'pending' })
  }

  // Treasury deployment (requires governor)
  if (deployment.treasuryAddress) {
    steps.push({ 
      id: 'treasury', 
      status: 'completed',
      address: deployment.treasuryAddress 
    })
  } else if (deployment.governorAddress) {
    steps.push({ id: 'treasury', status: 'ready' })
  } else {
    steps.push({ id: 'treasury', status: 'pending' })
  }

  // Prolend deployment (requires pair)
  if (deployment.prolendPair80 && deployment.prolendPair20) {
    steps.push({ 
      id: 'prolend', 
      status: 'completed',
      address: deployment.prolendPair80 // Use pair80 as primary address
    })
  } else if (deployment.pairAddress) {
    steps.push({ id: 'prolend', status: 'ready' })
  } else {
    steps.push({ id: 'prolend', status: 'pending' })
  }

  return steps
}
