// Pool discovery and management hooks
import { useMemo } from 'react'
import { Address } from 'viem'
import { useAllPoolsLength, useAllPools } from './useContracts'
import { usePool } from './usePool'
import { PoolData, PoolStatus, PoolFilters } from '@/types'

// Hook to get all pool addresses
export function useAllPoolAddresses() {
  const { data: poolsLength, isLoading: isLengthLoading } = useAllPoolsLength()
  
  // We'll use a maximum reasonable number of pools to avoid infinite hook calls
  // In production, this should be paginated or have a reasonable limit
  const MAX_POOLS = 100
  const poolCount = Math.min(Number(poolsLength || 0), MAX_POOLS)
  
  // Fetch pool addresses for available indices
  const pool0 = useAllPools(0)
  const pool1 = useAllPools(1)
  const pool2 = useAllPools(2)
  const pool3 = useAllPools(3)
  const pool4 = useAllPools(4)
  const pool5 = useAllPools(5)
  const pool6 = useAllPools(6)
  const pool7 = useAllPools(7)
  const pool8 = useAllPools(8)
  const pool9 = useAllPools(9)
  
  const poolQueries = [pool0, pool1, pool2, pool3, pool4, pool5, pool6, pool7, pool8, pool9]
  
  const poolAddresses = useMemo(() => {
    const addresses: Address[] = []
    for (let i = 0; i < poolCount && i < poolQueries.length; i++) {
      if (poolQueries[i].data) {
        addresses.push(poolQueries[i].data as Address)
      }
    }
    return addresses
  }, [poolQueries, poolCount])
  
  const isLoading = isLengthLoading || poolQueries.slice(0, poolCount).some(query => query.isLoading)
  const error = poolQueries.slice(0, poolCount).find(query => query.error)?.error
  
  return {
    addresses: poolAddresses,
    count: poolCount,
    isLoading,
    error,
  }
}

// Hook to get all pools with enriched data
export function useAllPoolsData() {
  const { addresses, count, isLoading: isAddressesLoading, error: addressesError } = useAllPoolAddresses()
  
  // For now, we'll limit to the first few pools to avoid too many hook calls
  // In production, this should be properly paginated
  const limitedAddresses = addresses.slice(0, 10)
  
  // Fetch pool data for each address - we need to call usePool for each known address
  const pool0Data = limitedAddresses[0] ? usePool(limitedAddresses[0]) : { data: undefined, isLoading: false, error: null, refetch: () => {} }
  const pool1Data = limitedAddresses[1] ? usePool(limitedAddresses[1]) : { data: undefined, isLoading: false, error: null, refetch: () => {} }
  const pool2Data = limitedAddresses[2] ? usePool(limitedAddresses[2]) : { data: undefined, isLoading: false, error: null, refetch: () => {} }
  const pool3Data = limitedAddresses[3] ? usePool(limitedAddresses[3]) : { data: undefined, isLoading: false, error: null, refetch: () => {} }
  const pool4Data = limitedAddresses[4] ? usePool(limitedAddresses[4]) : { data: undefined, isLoading: false, error: null, refetch: () => {} }
  
  const poolQueries = [pool0Data, pool1Data, pool2Data, pool3Data, pool4Data]
  
  const pools = useMemo(() => {
    return poolQueries
      .map(query => query.data)
      .filter(Boolean) as PoolData[]
  }, [poolQueries])
  
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
    status: ['success-pending', 'deploying', 'launched'] 
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
  const { pools, isLoading } = useAllPoolsData()
  
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
      successPendingPools: statusCounts['success-pending'] || 0,
      totalUsers,
      statusCounts,
    }
  }, [pools])
  
  return {
    stats,
    isLoading,
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
