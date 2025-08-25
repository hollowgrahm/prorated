'use client'

import { useMemo } from 'react'
import { Address } from 'viem'
import { useAllPoolsData } from './usePools'
import { usePool } from './usePool'
import { PoolData } from '@/types'
import { Project } from '@/types/project'
import { CONTRACT_ADDRESSES } from '@/lib/contracts-config'

/**
 * Convert PoolData to Project format for launched pools
 */
function poolDataToProject(poolData: PoolData): Project {
  // Calculate mock market data (in a real app, this would come from price oracles)
  const tokenSupply = Number(poolData.config.tokenTotalSupply / BigInt(10**18))
  const fundingRaised = Number(poolData.totalContributions / BigInt(10**6)) // Convert to USDC
  
  // Mock price data (in reality, this would come from DEX price feeds)
  const tokenPrice = 1.50 // Mock price for demo
  const marketCap = tokenSupply * tokenPrice
  const volume24h = marketCap * 0.05 // Mock 5% daily volume
  const totalValueLocked = fundingRaised * 1.2 // Mock TVL
  
  // Determine category based on token name/symbol
  let category = 'defi' // Default
  const name = poolData.config.tokenName.toLowerCase()
  if (name.includes('ai') || name.includes('ml')) category = 'ai'
  if (name.includes('game') || name.includes('nft')) category = 'gaming'
  if (name.includes('social') || name.includes('creator')) category = 'social'
  
  // Calculate launch date from pool end time
  const launchDate = poolData.config.endTime
  
  return {
    id: poolData.address,
    address: poolData.address,
    name: poolData.config.tokenName,
    symbol: poolData.config.tokenSymbol,
    description: generateProjectDescription(poolData.config.tokenName, poolData.config.tokenSymbol),
    category,
    launchDate,
    fundingRaised,
    fundingTokenSymbol: 'USDC',
    totalSupply: tokenSupply,
    tokenPrice,
    marketCap,
    totalValueLocked,
    volume24h,
    holders: Math.floor(Math.random() * 1000) + 100, // Mock holder count
    tokenAddress: poolData.proratedToken,
    pairAddress: poolData.proswapPair,
    lendingAddress: poolData.prolendPair80, // Use 80/20 pair as primary
    governanceAddress: poolData.proratedGovernor,
    website: generateWebsiteUrl(poolData.config.tokenSymbol),
    twitter: generateTwitterUrl(poolData.config.tokenSymbol),
    priceChange24h: (Math.random() - 0.5) * 20, // Mock price change -10% to +10%
    priceChange7d: (Math.random() - 0.5) * 40, // Mock weekly change -20% to +20%
    allTimeHigh: tokenPrice * (1 + Math.random() * 0.5), // Mock ATH
    allTimeLow: tokenPrice * (0.5 + Math.random() * 0.3), // Mock ATL
  }
}

/**
 * Generate project description based on token name and symbol
 */
function generateProjectDescription(tokenName: string, tokenSymbol: string): string {
  const name = tokenName.toLowerCase()
  
  if (name.includes('prorated') || name.includes('pro')) {
    return 'The native protocol token for Prorated - a comprehensive DeFi platform enabling crowdfunded token launches with integrated DEX, lending, and governance. PRO holders participate in protocol governance and earn fees from all platform activities.'
  }
  
  if (name.includes('defi')) {
    return `${tokenName} is a next-generation DeFi infrastructure protocol offering automated yield farming, cross-chain capabilities, and innovative financial primitives for the decentralized economy.`
  }
  
  if (name.includes('ai')) {
    return `${tokenName} leverages artificial intelligence and machine learning to provide autonomous trading strategies and on-chain analytics for optimal DeFi participation.`
  }
  
  if (name.includes('game')) {
    return `${tokenName} powers a decentralized gaming ecosystem with play-to-earn mechanics, NFT integration, and community-driven game development.`
  }
  
  // Default description
  return `${tokenName} (${tokenSymbol}) is a community-launched token that successfully completed its funding phase on Prorated Protocol. The project features a fully deployed ecosystem including DEX trading, governance, and lending capabilities.`
}

/**
 * Generate website URL based on token symbol
 */
function generateWebsiteUrl(symbol: string): string {
  if (symbol.toLowerCase() === 'pro') {
    return 'https://prorated.finance'
  }
  return `https://${symbol.toLowerCase()}.finance`
}

/**
 * Generate Twitter URL based on token symbol
 */
function generateTwitterUrl(symbol: string): string {
  if (symbol.toLowerCase() === 'pro') {
    return 'https://twitter.com/proratedfi'
  }
  return `https://twitter.com/${symbol.toLowerCase()}protocol`
}

/**
 * Hook to fetch all launched projects from the blockchain
 */
export function useLaunchedProjects() {
  // Get all pool data
  const { pools, isLoading, error } = useAllPoolsData()
  
  // Filter for launched pools and convert to projects
  const projects = useMemo(() => {
    if (!pools) return []
    
    return pools
      .filter(pool => pool.status === 'launched')
      .map(poolDataToProject)
      .sort((a, b) => b.launchDate - a.launchDate) // Sort by launch date, newest first
  }, [pools])
  
  return {
    projects,
    isLoading,
    error,
    refetch: () => {
      // The underlying pools hook will handle refetching
      window.location.reload()
    }
  }
}

/**
 * Hook to get a specific launched project by address
 */
export function useLaunchedProject(address: string) {
  const { data: poolData, isLoading, error } = usePool(address as Address)
  
  const project = useMemo(() => {
    if (!poolData || poolData.status !== 'launched') return null
    return poolDataToProject(poolData)
  }, [poolData])
  
  return {
    project,
    isLoading,
    error
  }
}

/**
 * Check if an address is a known launched project
 */
export function isLaunchedProject(address: string): boolean {
  // Check if it's our known launched pool
  const launchedPoolAddress = (CONTRACT_ADDRESSES as any).launchedPool
  if (launchedPoolAddress && address.toLowerCase() === launchedPoolAddress.toLowerCase()) {
    return true
  }
  
  // In the future, we could check against a list of all launched pools
  return false
}
