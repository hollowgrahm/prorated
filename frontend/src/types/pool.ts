export type PoolStatus = 'upcoming' | 'active' | 'failed' | 'deploying' | 'launched'

export interface Pool {
  id: string
  address: string
  
  // Token Configuration
  tokenName: string
  tokenSymbol: string
  tokenTotalSupply: number
  
  // Funding Configuration  
  developmentFund: number
  liquidityFund: number
  minTotalContributions: number // developmentFund + liquidityFund
  fundingToken: string // Address of the funding token (e.g., USDC)
  fundingTokenSymbol: string // Symbol of funding token for display
  
  // Timing
  startTime: number
  endTime: number
  
  // Allocations (percentages)
  developerPercent: number
  treasuryPercent: number
  daoPercent: number
  
  // Current State
  totalContributions: number
  totalShares: number
  contributors: number
  status: PoolStatus
  
  // Developer
  developer: string
  description: string
  
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
