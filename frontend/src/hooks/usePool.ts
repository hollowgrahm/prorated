// Pool-specific hooks using direct viem calls since Wagmi is stuck
import { useMemo, useState, useEffect } from 'react'
import { Address, createPublicClient, http } from 'viem'
import { anvilLocal } from '@/lib/wagmi'
import { env } from '@/lib/env'
import { PoolData, PoolStatus } from '@/types'

// ABI for individual pool contract calls
const POOL_ABI = [
  // Public variables from ProratedPoolStorage
  { name: 'tokenName', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'tokenSymbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'tokenTotalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'developmentFund', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'liquidityFund', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'minTotalContributions', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'startTime', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'endTime', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'fundingToken', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'totalContributions', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'totalShares', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'developerPercent', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'treasuryPercent', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'daoPercent', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'proratedToken', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'proswapPair', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'proratedVeNFT', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'proratedGovernor', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'proratedTreasury', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'prolendPair80', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'prolendPair20', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  
  // View functions
  { name: 'hasReachedMinimum', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] },
] as const

// Create a direct public client for pool calls
const publicClient = createPublicClient({
  chain: anvilLocal,
  transport: http(env.rpcUrl)
})

export function usePool(poolAddress: Address) {
  const [poolData, setPoolData] = useState<PoolData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !poolAddress || poolAddress === '0x0000000000000000000000000000000000000000') {
      setIsLoading(false)
      setPoolData(null)
      return
    }

    const fetchPoolData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log(`🔍 Fetching pool data for ${poolAddress}`)

        // Fetch all pool data in parallel
        const [
          tokenName,
          tokenSymbol,
          tokenTotalSupply,
          developmentFund,
          liquidityFund,
          minTotalContributions,
          startTime,
          endTime,
          fundingToken,
          totalContributions,
          totalShares,
          developerPercent,
          treasuryPercent,
          daoPercent,
          proratedToken,
          proswapPair,
          proratedVeNFT,
          proratedGovernor,
          proratedTreasury,
          prolendPair80,
          prolendPair20,
          hasReachedMinimum
        ] = await Promise.all([
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'tokenName' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'tokenSymbol' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'tokenTotalSupply' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'developmentFund' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'liquidityFund' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'minTotalContributions' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'startTime' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'endTime' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'fundingToken' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'totalContributions' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'totalShares' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'developerPercent' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'treasuryPercent' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'daoPercent' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'proratedToken' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'proswapPair' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'proratedVeNFT' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'proratedGovernor' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'proratedTreasury' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'prolendPair80' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'prolendPair20' }),
          publicClient.readContract({ address: poolAddress, abi: POOL_ABI, functionName: 'hasReachedMinimum' })
        ])

        console.log(`✅ Pool data fetched for ${poolAddress}:`, {
          tokenName,
          tokenSymbol,
          startTime: Number(startTime),
          endTime: Number(endTime)
        })

        // Calculate derived data
        const now = Math.floor(Date.now() / 1000)
        const startTimeNum = Number(startTime)
        const endTimeNum = Number(endTime)
        const totalContributionsBig = totalContributions as bigint
        const minContributionsBig = minTotalContributions as bigint
        
        // Determine pool status
        let status: PoolStatus
        if (now < startTimeNum) {
          status = 'upcoming'
        } else if (now <= endTimeNum) {
          status = 'active'
        } else if (!hasReachedMinimum) {
          status = 'failed'
        } else if (proratedToken === '0x0000000000000000000000000000000000000000') {
          status = 'deploying'
        } else {
          status = 'launched'
        }

        // Calculate progress percentage
        const progressPercentage = minContributionsBig > 0n 
          ? Math.min((Number(totalContributionsBig) / Number(minContributionsBig)) * 100, 100)
          : 0

        // Calculate time remaining
        const timeRemaining = now <= endTimeNum ? endTimeNum - now : 0

        const data: PoolData = {
          address: poolAddress,
          config: {
            owner: '0x0000000000000000000000000000000000000000' as Address, // We don't fetch this for now
            tokenName: tokenName as string,
            tokenSymbol: tokenSymbol as string,
            tokenTotalSupply: tokenTotalSupply as bigint,
            developmentFund: developmentFund as bigint,
            liquidityFund: liquidityFund as bigint,
            startTime: startTimeNum,
            endTime: endTimeNum,
            fundingToken: fundingToken as Address,
            developerPercent: Number(developerPercent),
            treasuryPercent: Number(treasuryPercent),
            daoPercent: Number(daoPercent),
          },
          totalContributions: totalContributionsBig,
          totalShares: totalShares as bigint,
          minTotalContributions: minContributionsBig,
          proratedToken: proratedToken as Address,
          proswapPair: proswapPair as Address,
          proratedVeNFT: proratedVeNFT as Address,
          proratedGovernor: proratedGovernor as Address,
          proratedTreasury: proratedTreasury as Address,
          prolendPair80: prolendPair80 as Address,
          prolendPair20: prolendPair20 as Address,
          status,
          progressPercentage,
          timeRemaining: timeRemaining > 0 ? timeRemaining : undefined,
          hasReachedMinimum: hasReachedMinimum as boolean,
        }

        setPoolData(data)
      } catch (err) {
        console.error(`❌ Error fetching pool data for ${poolAddress}:`, err)
        setError(err as Error)
        setPoolData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPoolData()
  }, [poolAddress])

  const refetch = () => {
    if (poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000') {
      setIsLoading(true)
      // The useEffect will handle the refetch
    }
  }

  return {
    data: poolData,
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
      isReadyForDeployment: poolData.status === 'deploying',
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
      canDeploy: poolData.status === 'deploying',
      canClaim: poolData.status === 'launched' || poolData.status === 'failed',
      meetsMinimum: progress.hasReachedMinimum,
      isActive: timing.isActive,
      hasEnded: timing.hasEnded,
    }
  }, [poolData, timing, progress])
}