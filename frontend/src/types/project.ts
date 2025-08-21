export type ProjectCategory = 'defi' | 'gaming' | 'ai' | 'social' | 'infrastructure' | 'all'

export interface Project {
  id: string
  address: string
  
  // Basic Info
  name: string
  symbol: string
  description: string
  category: ProjectCategory
  logoUrl?: string
  
  // Launch Details
  launchDate: number
  fundingRaised: number
  fundingTokenSymbol: string
  totalSupply: number
  
  // Current Metrics
  tokenPrice: number // In funding token terms
  marketCap: number
  totalValueLocked: number
  volume24h: number
  holders: number
  
  // Contract Addresses
  tokenAddress: string
  pairAddress: string
  lendingAddress?: string
  governanceAddress?: string
  
  // Social & Links
  website?: string
  twitter?: string
  discord?: string
  github?: string
  
  // Performance
  priceChange24h: number
  priceChange7d: number
  allTimeHigh: number
  allTimeLow: number
}

export interface ProjectFilters {
  search: string
  category: ProjectCategory
  sortBy: 'newest' | 'oldest' | 'market-cap' | 'tvl' | 'volume' | 'price-change'
  minMarketCap?: number
  minTVL?: number
}

export interface ProjectCardProps {
  project: Project
  onClick?: (project: Project) => void
  className?: string
}
