// Pool discovery and management hooks
import { useMemo, useEffect, useState } from 'react'
import { Address, createPublicClient, http } from 'viem'
import { anvilLocal } from '@/lib/wagmi'
import { env } from '@/lib/env'
import { proratedFactoryConfig } from '@/lib/contracts'
import { useAllPoolsLength, useAllPools } from './useContracts'
import { usePool } from './usePool'
import { PoolData, PoolStatus, PoolFilters } from '@/types'

// Direct viem client for testing
const publicClient = createPublicClient({
  chain: anvilLocal,
  transport: http(env.rpcUrl)
})

// Direct viem-based hook as fallback
export function useDirectPoolCount() {
  const [poolCount, setPoolCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const fetchPoolCount = async () => {
      try {
        setIsLoading(true)
        const result = await publicClient.readContract({
          address: proratedFactoryConfig.address,
          abi: proratedFactoryConfig.abi,
          functionName: 'getPoolCount',
        })
        console.log('Direct viem call result:', result)
        setPoolCount(Number(result))
        setError(null)
      } catch (err) {
        console.error('Direct viem call error:', err)
        setError(err as Error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPoolCount()
  }, [])

  return { poolCount, isLoading, error }
}

// Hook to get all pool addresses
export function useAllPoolAddresses() {
  console.log('🎯 useAllPoolAddresses hook called')
  const { data: poolsLength, isLoading: isLengthLoading, error: lengthError } = useAllPoolsLength()
  const { poolCount: directPoolCount, isLoading: directLoading, error: directError } = useDirectPoolCount()
  
  // Debug logging
  console.log('useAllPoolAddresses Debug:', {
    wagmiPoolsLength: poolsLength,
    wagmiIsLoading: isLengthLoading,
    wagmiError: lengthError?.message,
    directPoolCount,
    directLoading,
    directError: directError?.message
  })
  
  // Don't early return - this violates React hooks rules
  // Instead, handle loading state in the logic below
  
  // We'll use a maximum reasonable number of pools to avoid infinite hook calls
  // In production, this should be paginated or have a reasonable limit
  const MAX_POOLS = 100
  // Use direct count as fallback if Wagmi fails
  const wagmiCount = poolsLength ? Number(poolsLength) : 0
  const effectiveCount = wagmiCount > 0 ? wagmiCount : (directPoolCount || 0)
  const poolCount = Math.min(effectiveCount, MAX_POOLS)
  
  console.log('Pool count conversion debug:', {
    poolsLength,
    poolsLengthType: typeof poolsLength,
    wagmiCount,
    directPoolCount,
    effectiveCount,
    finalPoolCount: poolCount
  })
  
  // Fetch pool addresses for available indices (only fetch pools that exist)
  const pool0 = useAllPools(poolCount > 0 ? 0 : -1)
  const pool1 = useAllPools(poolCount > 1 ? 1 : -1)
  const pool2 = useAllPools(poolCount > 2 ? 2 : -1)
  const pool3 = useAllPools(poolCount > 3 ? 3 : -1)
  const pool4 = useAllPools(poolCount > 4 ? 4 : -1)
  const pool5 = useAllPools(poolCount > 5 ? 5 : -1)
  const pool6 = useAllPools(poolCount > 6 ? 6 : -1)
  const pool7 = useAllPools(poolCount > 7 ? 7 : -1)
  const pool8 = useAllPools(poolCount > 8 ? 8 : -1)
  const pool9 = useAllPools(poolCount > 9 ? 9 : -1)
  
  const poolQueries = useMemo(() => [
    pool0, pool1, pool2, pool3, pool4, pool5, pool6, pool7, pool8, pool9
  ], [pool0, pool1, pool2, pool3, pool4, pool5, pool6, pool7, pool8, pool9])
  
  const poolAddresses = useMemo(() => {
    const addresses: Address[] = []
    for (let i = 0; i < poolCount && i < poolQueries.length; i++) {
      if (poolQueries[i].data) {
        addresses.push(poolQueries[i].data as Address)
      }
    }
    console.log('Pool addresses debug:', {
      poolCount,
      poolQueriesLength: poolQueries.length,
      poolQueriesData: poolQueries.map((q, i) => ({ index: i, data: q.data, isLoading: q.isLoading, error: q.error?.message })),
      addresses
    })
    return addresses
  }, [poolQueries, poolCount])
  
  // Handle loading state properly without early returns
  const hasPoolCount = poolCount > 0
  const stillLoadingPoolCount = isLengthLoading && directLoading // Both sources still loading
  const loadingIndividualPools = hasPoolCount && poolQueries.slice(0, poolCount).some(query => query.isLoading)
  const isLoading = stillLoadingPoolCount || loadingIndividualPools
  const error = lengthError || directError || (hasPoolCount && poolQueries.slice(0, poolCount).find(query => query.error)?.error)
  
  console.log('useAllPoolAddresses loading debug:', {
    isLengthLoading,
    directLoading,
    hasPoolCount,
    stillLoadingPoolCount,
    loadingIndividualPools,
    finalIsLoading: isLoading,
    poolAddressesLength: poolAddresses.length
  })
  
  return {
    addresses: poolAddresses,
    count: poolCount,
    isLoading,
    error,
  }
}

// Hook to get all pools with enriched data
export function useAllPoolsData() {
  console.log('🎪 useAllPoolsData hook called')
  const { addresses, count, isLoading: isAddressesLoading, error: addressesError } = useAllPoolAddresses()
  
  console.log('useAllPoolsData input debug:', {
    addresses,
    addressesLength: addresses?.length,
    count,
    isAddressesLoading,
    addressesError: addressesError?.message
  })
  
  // For now, we'll limit to the first few pools to avoid too many hook calls
  // In production, this should be properly paginated
  const limitedAddresses = addresses.slice(0, 10)
  
  // Default address for when no pool address is available
  const defaultAddress = '0x0000000000000000000000000000000000000000' as Address
  
  // Only use real addresses, not default address
  const addr0 = limitedAddresses[0] || defaultAddress
  const addr1 = limitedAddresses[1] || defaultAddress
  const addr2 = limitedAddresses[2] || defaultAddress
  const addr3 = limitedAddresses[3] || defaultAddress
  const addr4 = limitedAddresses[4] || defaultAddress
  
  console.log('Pool addresses for usePool calls:', {
    addr0, addr1, addr2, addr3, addr4,
    hasRealAddresses: limitedAddresses.length > 0
  })
  
  // Fetch pool data for each address - hooks must be called unconditionally
  const pool0Data = usePool(addr0)
  const pool1Data = usePool(addr1)
  const pool2Data = usePool(addr2)
  const pool3Data = usePool(addr3)
  const pool4Data = usePool(addr4)
  
  const poolQueries = useMemo(() => [
    pool0Data, pool1Data, pool2Data, pool3Data, pool4Data
  ], [pool0Data, pool1Data, pool2Data, pool3Data, pool4Data])
  
  const pools = useMemo(() => {
    // Only process results if we have addresses and they're not loading
    if (isAddressesLoading || limitedAddresses.length === 0) {
      console.log('useAllPoolsData debug: skipping due to loading or no addresses', {
        isAddressesLoading,
        addressesLength: limitedAddresses.length
      })
      return []
    }
    
    const result = poolQueries
      .map((query, index) => {
        const address = limitedAddresses[index]
        // Only include if we have a real address (not zero address) and valid data
        if (address && address !== defaultAddress && query.data) {
          return query.data
        }
        return null
      })
      .filter(Boolean) as PoolData[]
    
      console.log('useAllPoolsData debug:', {
    addresses,
    count,
    limitedAddresses,
    isAddressesLoading,
    poolQueriesData: poolQueries.map((q, i) => ({ 
      index: i, 
      address: limitedAddresses[i],
      data: q.data, 
      isLoading: q.isLoading, 
      error: q.error?.message,
      hasData: !!q.data,
      dataKeys: q.data ? Object.keys(q.data) : []
    })),
    resultCount: result.length,
    result: result.map(pool => ({
      address: pool?.address,
      tokenName: pool?.config?.tokenName,
      status: pool?.status
    }))
  })
    
    return result
  }, [poolQueries, limitedAddresses, addresses, count, isAddressesLoading, defaultAddress])
  
  const isLoading = isAddressesLoading || poolQueries.some(query => query.isLoading)
  const error = addressesError || poolQueries.find(query => query.error)?.error
  
  return {
    pools,
    count,
    isLoading,
    error,
    refetch: () => {
      poolQueries.forEach(query => query.refetch())
    },
  }
}

// Hook to filter and sort pools
export function useFilteredPools(filters?: PoolFilters) {
  const { pools, isLoading, error, refetch } = useAllPoolsData()
  
  const filteredPools = useMemo(() => {
    if (!pools || !filters) return pools
    
    let filtered = pools
    
    // Filter by status
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(pool => filters.status!.includes(pool.status))
    }
    
    // Filter by search term (token name or symbol)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(pool => 
        pool.config.tokenName.toLowerCase().includes(searchTerm) ||
        pool.config.tokenSymbol.toLowerCase().includes(searchTerm)
      )
    }
    
    // Sort pools
    if (filters.sortBy) {
      filtered = [...filtered].sort((a, b) => {
        const order = filters.sortOrder === 'desc' ? -1 : 1
        
        switch (filters.sortBy) {
          case 'timeRemaining':
            const aTime = a.timeRemaining || (a.config.endTime - Date.now() / 1000)
            const bTime = b.timeRemaining || (b.config.endTime - Date.now() / 1000)
            return (aTime - bTime) * order
            
          case 'progress':
            return (a.progressPercentage - b.progressPercentage) * order
            
          case 'totalContributions':
            return (Number(a.totalContributions) - Number(b.totalContributions)) * order
            
          case 'created':
            return (a.config.startTime - b.config.startTime) * order
            
          default:
            return 0
        }
      })
    }
    
    return filtered
  }, [pools, filters])
  
  return {
    pools: filteredPools,
    totalCount: pools?.length || 0,
    filteredCount: filteredPools?.length || 0,
    isLoading,
    error,
    refetch,
  }
}

// Hook to get pools by status
export function usePoolsByStatus(status: PoolStatus) {
  return useFilteredPools({ status: [status] })
}

// Convenience hooks for common pool categories
export function useActivePools() {
  return usePoolsByStatus('active')
}

export function useUpcomingPools() {
  return usePoolsByStatus('upcoming')
}

export function useSuccessfulPools() {
  return useFilteredPools({ 
    status: ['deploying', 'launched'] 
  })
}

export function useLaunchedPools() {
  return usePoolsByStatus('launched')
}

export function useFailedPools() {
  return usePoolsByStatus('failed')
}

// Hook for pool statistics
export function usePoolStats() {
  const { pools, isLoading, error } = useAllPoolsData()
  
  const stats = useMemo(() => {
    if (!pools) return null
    
    const statusCounts = pools.reduce((acc, pool) => {
      acc[pool.status] = (acc[pool.status] || 0) + 1
      return acc
    }, {} as Record<PoolStatus, number>)
    
    const totalFunding = pools.reduce((sum, pool) => 
      sum + Number(pool.totalContributions), 0
    )
    
    const totalUsers = new Set(
      pools.flatMap(pool => [pool.config.owner])
    ).size
    
    return {
      totalPools: pools.length,
      totalFunding: BigInt(totalFunding),
      activePools: statusCounts.active || 0,
      upcomingPools: statusCounts.upcoming || 0,
      launchedProjects: statusCounts.launched || 0,
      failedPools: statusCounts.failed || 0,
      deployingPools: statusCounts.deploying || 0,
      totalUsers,
      statusCounts,
    }
  }, [pools])
  
  return {
    stats,
    isLoading,
    error,
  }
}

// Hook to search pools
export function useSearchPools(query: string) {
  return useFilteredPools({ 
    search: query.trim() || undefined 
  })
}

// Hook for pagination
export function usePaginatedPools(filters?: PoolFilters, pageSize: number = 12) {
  const { pools, totalCount, filteredCount, isLoading, error, refetch } = useFilteredPools(filters)
  
  const paginatedData = useMemo(() => {
    if (!pools) return { pages: [], totalPages: 0 }
    
    const totalPages = Math.ceil(pools.length / pageSize)
    const pages = []
    
    for (let i = 0; i < totalPages; i++) {
      const start = i * pageSize
      const end = start + pageSize
      pages.push(pools.slice(start, end))
    }
    
    return { pages, totalPages }
  }, [pools, pageSize])
  
  return {
    ...paginatedData,
    totalCount,
    filteredCount,
    pageSize,
    isLoading,
    error,
    refetch,
  }
}
