// Pool-specific hooks using individual contract calls for compatibility
import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import { Address } from 'viem'
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

export function usePool(poolAddress: Address) {
  // Make individual contract calls in parallel
  const tokenName = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'tokenName',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const tokenSymbol = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'tokenSymbol',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const tokenTotalSupply = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'tokenTotalSupply',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const developmentFund = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'developmentFund',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const liquidityFund = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'liquidityFund',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const minTotalContributions = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'minTotalContributions',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const startTime = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'startTime',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const endTime = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'endTime',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const fundingToken = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'fundingToken',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const totalContributions = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'totalContributions',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const totalShares = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'totalShares',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const developerPercent = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'developerPercent',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const treasuryPercent = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'treasuryPercent',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const daoPercent = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'daoPercent',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const proratedToken = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'proratedToken',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const proswapPair = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'proswapPair',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const proratedVeNFT = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'proratedVeNFT',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const proratedGovernor = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'proratedGovernor',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const proratedTreasury = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'proratedTreasury',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const prolendPair80 = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'prolendPair80',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const prolendPair20 = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'prolendPair20',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  const hasReachedMinimum = useReadContract({
    address: poolAddress,
    abi: POOL_ABI,
    functionName: 'hasReachedMinimum',
    query: { enabled: !!poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000' }
  })

  // Aggregate all the individual calls
  const poolData = useMemo((): PoolData | null => {
    // Check if all required data is loaded
    if (
      !tokenName.data || !tokenSymbol.data || !tokenTotalSupply.data ||
      !developmentFund.data || !liquidityFund.data || !minTotalContributions.data ||
      !startTime.data || !endTime.data || !fundingToken.data ||
      !totalContributions.data || !totalShares.data ||
      !developerPercent.data || !treasuryPercent.data || !daoPercent.data ||
      !proratedToken.data || !proswapPair.data || !proratedVeNFT.data ||
      !proratedGovernor.data || !proratedTreasury.data ||
      !prolendPair80.data || !prolendPair20.data ||
      hasReachedMinimum.data === undefined
    ) {
      return null
    }

    // Calculate derived data
    const now = Math.floor(Date.now() / 1000)
    const startTimeNum = Number(startTime.data)
    const endTimeNum = Number(endTime.data)
    const totalContributionsBig = totalContributions.data as bigint
    const minContributionsBig = minTotalContributions.data as bigint
    
    // Determine pool status
    let status: PoolStatus
    if (now < startTimeNum) {
      status = 'upcoming'
    } else if (now <= endTimeNum) {
      status = 'active'
    } else if (!hasReachedMinimum.data) {
      status = 'failed'
    } else if (proratedToken.data === '0x0000000000000000000000000000000000000000') {
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

    return {
      address: poolAddress,
      config: {
        owner: '0x0000000000000000000000000000000000000000' as Address, // We don't fetch this for now
        tokenName: tokenName.data,
        tokenSymbol: tokenSymbol.data,
        tokenTotalSupply: tokenTotalSupply.data as bigint,
        developmentFund: developmentFund.data as bigint,
        liquidityFund: liquidityFund.data as bigint,
        startTime: startTimeNum,
        endTime: endTimeNum,
        fundingToken: fundingToken.data as Address,
        developerPercent: Number(developerPercent.data),
        treasuryPercent: Number(treasuryPercent.data),
        daoPercent: Number(daoPercent.data),
      },
      totalContributions: totalContributionsBig,
      totalShares: totalShares.data as bigint,
      minTotalContributions: minContributionsBig,
      proratedToken: proratedToken.data as Address,
      proswapPair: proswapPair.data as Address,
      proratedVeNFT: proratedVeNFT.data as Address,
      proratedGovernor: proratedGovernor.data as Address,
      proratedTreasury: proratedTreasury.data as Address,
      prolendPair80: prolendPair80.data as Address,
      prolendPair20: prolendPair20.data as Address,
      status,
      progressPercentage,
      timeRemaining: timeRemaining > 0 ? timeRemaining : undefined,
      hasReachedMinimum: hasReachedMinimum.data,
    }
  }, [
    tokenName.data, tokenSymbol.data, tokenTotalSupply.data,
    developmentFund.data, liquidityFund.data, minTotalContributions.data,
    startTime.data, endTime.data, fundingToken.data,
    totalContributions.data, totalShares.data,
    developerPercent.data, treasuryPercent.data, daoPercent.data,
    proratedToken.data, proswapPair.data, proratedVeNFT.data,
    proratedGovernor.data, proratedTreasury.data,
    prolendPair80.data, prolendPair20.data,
    hasReachedMinimum.data, poolAddress
  ])

  // Determine loading and error states
  const isLoading = 
    tokenName.isLoading || tokenSymbol.isLoading || tokenTotalSupply.isLoading ||
    developmentFund.isLoading || liquidityFund.isLoading || minTotalContributions.isLoading ||
    startTime.isLoading || endTime.isLoading || fundingToken.isLoading ||
    totalContributions.isLoading || totalShares.isLoading ||
    developerPercent.isLoading || treasuryPercent.isLoading || daoPercent.isLoading ||
    proratedToken.isLoading || proswapPair.isLoading || proratedVeNFT.isLoading ||
    proratedGovernor.isLoading || proratedTreasury.isLoading ||
    prolendPair80.isLoading || prolendPair20.isLoading ||
    hasReachedMinimum.isLoading

  const error = 
    tokenName.error || tokenSymbol.error || tokenTotalSupply.error ||
    developmentFund.error || liquidityFund.error || minTotalContributions.error ||
    startTime.error || endTime.error || fundingToken.error ||
    totalContributions.error || totalShares.error ||
    developerPercent.error || treasuryPercent.error || daoPercent.error ||
    proratedToken.error || proswapPair.error || proratedVeNFT.error ||
    proratedGovernor.error || proratedTreasury.error ||
    prolendPair80.error || prolendPair20.error ||
    hasReachedMinimum.error

  const refetch = () => {
    tokenName.refetch()
    tokenSymbol.refetch()
    tokenTotalSupply.refetch()
    developmentFund.refetch()
    liquidityFund.refetch()
    minTotalContributions.refetch()
    startTime.refetch()
    endTime.refetch()
    fundingToken.refetch()
    totalContributions.refetch()
    totalShares.refetch()
    developerPercent.refetch()
    treasuryPercent.refetch()
    daoPercent.refetch()
    proratedToken.refetch()
    proswapPair.refetch()
    proratedVeNFT.refetch()
    proratedGovernor.refetch()
    proratedTreasury.refetch()
    prolendPair80.refetch()
    prolendPair20.refetch()
    hasReachedMinimum.refetch()
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
