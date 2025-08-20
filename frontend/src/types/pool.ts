export type PoolStatus = 'upcoming' | 'active' | 'failed' | 'success-pending' | 'deploying' | 'launched'

export interface Pool {
  id: string
  address: string
  tokenName: string
  tokenSymbol: string
  description: string
  startTime: number
  endTime: number
  totalContributions: number
  minTotalContributions: number
  maxTotalContributions?: number
  developer: string
  status: PoolStatus
  contributors: number
  
  // Optional deployment addresses (set after successful funding)
  tokenAddress?: string
  pairAddress?: string
  lendingAddress?: string
  governanceAddress?: string
}

export interface PoolCardProps {
  pool: Pool
  onClick?: (pool: Pool) => void
  className?: string
}

export interface PoolFilters {
  search: string
  status: PoolStatus | 'all'
  sortBy: 'recent' | 'ending-soon' | 'most-funded' | 'least-funded' | 'most-contributors' | 'funding-progress'
}
