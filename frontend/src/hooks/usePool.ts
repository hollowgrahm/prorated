// Higher-level pool hooks with business logic
import { useMemo } from 'react'
import { Address } from 'viem'
import { usePoolData } from './useContracts'
import { PoolData, PoolStatus } from '@/types'
import { getPoolStatus, calculateProgress } from '@/lib/utils'

export function usePool(poolAddress: Address) {
  const { data: rawPoolData, isLoading, error, refetch } = usePoolData(poolAddress)
  
  const enrichedPoolData: PoolData | undefined = useMemo(() => {
    if (!rawPoolData) return undefined
    
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
    ] = rawPoolData
    
    const poolData: PoolData = {
      address: poolAddress,
      config: {
        owner: config.owner,
        tokenName: config.tokenName,
        tokenSymbol: config.tokenSymbol,
        tokenTotalSupply: config.tokenTotalSupply,
        developmentFund: config.developmentFund,
        liquidityFund: config.liquidityFund,
        startTime: Number(config.startTime),
        endTime: Number(config.endTime),
        fundingToken: config.fundingToken,
        developerPercent: Number(config.developerPercent),
        treasuryPercent: Number(config.treasuryPercent),
        daoPercent: Number(config.daoPercent),
      },
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
      // Derived fields
      status: 'upcoming' as PoolStatus, // Will be calculated below
      progressPercentage: 0,
      hasReachedMinimum: false,
    }
    
    // Calculate derived fields
    poolData.status = getPoolStatus(poolData)
    poolData.progressPercentage = calculateProgress(totalContributions, minTotalContributions)
    poolData.hasReachedMinimum = totalContributions >= minTotalContributions
    
    // Calculate time remaining if active
    const now = Date.now() / 1000
    if (poolData.status === 'active') {
      poolData.timeRemaining = Math.max(0, poolData.config.endTime - now)
    }
    
    return poolData
  }, [rawPoolData, poolAddress])
  
  return {
    data: enrichedPoolData,
    isLoading,
    error,
    refetch,
  }
}

export function usePoolStatus(poolAddress: Address): PoolStatus | undefined {
  const { data: poolData } = usePool(poolAddress)
  return poolData?.status
}

export function usePoolProgress(poolAddress: Address) {
  const { data: poolData } = usePool(poolAddress)
  
  return useMemo(() => {
    if (!poolData) return { percentage: 0, hasReachedMinimum: false }
    
    return {
      percentage: poolData.progressPercentage,
      hasReachedMinimum: poolData.hasReachedMinimum,
      totalContributions: poolData.totalContributions,
      minTotalContributions: poolData.minTotalContributions,
    }
  }, [poolData])
}

export function usePoolTiming(poolAddress: Address) {
  const { data: poolData } = usePool(poolAddress)
  
  return useMemo(() => {
    if (!poolData) return {}
    
    const now = Date.now() / 1000
    const { startTime, endTime } = poolData.config
    
    return {
      startTime,
      endTime,
      timeRemaining: poolData.timeRemaining,
      hasStarted: now >= startTime,
      hasEnded: now > endTime,
      isActive: now >= startTime && now <= endTime,
      isUpcoming: now < startTime,
    }
  }, [poolData])
}

export function usePoolDeploymentStatus(poolAddress: Address) {
  const { data: poolData } = usePool(poolAddress)
  
  return useMemo(() => {
    if (!poolData) return {}
    
    const zeroAddress = '0x0000000000000000000000000000000000000000'
    
    return {
      tokenDeployed: poolData.proratedToken !== zeroAddress,
      pairDeployed: poolData.proswapPair !== zeroAddress,
      veNFTDeployed: poolData.proratedVeNFT !== zeroAddress,
      governorDeployed: poolData.proratedGovernor !== zeroAddress,
      treasuryDeployed: poolData.proratedTreasury !== zeroAddress,
      prolendDeployed: poolData.prolendPair80 !== zeroAddress && poolData.prolendPair20 !== zeroAddress,
      
      // Deployment addresses
      addresses: {
        token: poolData.proratedToken,
        pair: poolData.proswapPair,
        veNFT: poolData.proratedVeNFT,
        governor: poolData.proratedGovernor,
        treasury: poolData.proratedTreasury,
        prolendPair80: poolData.prolendPair80,
        prolendPair20: poolData.prolendPair20,
      },
      
      // Overall status
      isFullyDeployed: poolData.status === 'launched',
      isPartiallyDeployed: poolData.status === 'deploying',
      isReadyForDeployment: poolData.status === 'success-pending',
    }
  }, [poolData])
}

// Validation helpers
export function usePoolValidation(poolAddress: Address) {
  const { data: poolData } = usePool(poolAddress)
  const timing = usePoolTiming(poolAddress)
  const progress = usePoolProgress(poolAddress)
  
  return useMemo(() => {
    if (!poolData) return { isValid: false }
    
    return {
      isValid: true,
      canContribute: poolData.status === 'active',
      canDeploy: poolData.status === 'success-pending',
      canClaim: poolData.status === 'launched' || poolData.status === 'failed',
      meetsMinimum: progress.hasReachedMinimum,
      isActive: timing.isActive,
      hasEnded: timing.hasEnded,
    }
  }, [poolData, timing, progress])
}
