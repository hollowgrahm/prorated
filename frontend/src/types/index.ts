// Prorated Protocol Type Definitions

import { Address } from 'viem'

// Pool Status Types
export type PoolStatus = 
  | 'upcoming'        // startTime > now
  | 'active'          // startTime <= now <= endTime  
  | 'failed'          // ended + didn't reach minimum
  | 'success-pending' // ended + reached minimum + no deployment yet
  | 'deploying'       // some components deployed
  | 'launched'        // fully deployed (governance + prolend)

// Pool Configuration (from contract)
export interface PoolConfig {
  owner: Address
  tokenName: string
  tokenSymbol: string
  tokenTotalSupply: bigint
  developmentFund: bigint
  liquidityFund: bigint
  startTime: number
  endTime: number
  fundingToken: Address
  developerPercent: number
  treasuryPercent: number
  daoPercent: number
}

// Pool Data (enriched with contract state)
export interface PoolData {
  address: Address
  config: PoolConfig
  totalContributions: bigint
  totalShares: bigint
  minTotalContributions: bigint
  
  // Deployment addresses (0x0 = not deployed)
  proratedToken: Address
  proswapPair: Address
  proratedVeNFT: Address
  proratedGovernor: Address
  proratedTreasury: Address
  prolendPair80: Address
  prolendPair20: Address
  
  // Derived data
  status: PoolStatus
  progressPercentage: number
  timeRemaining?: number
  hasReachedMinimum: boolean
}

// User Contribution
export interface UserContribution {
  amount: bigint
  lockDuration: number // weeks (1-208)
  shares: bigint
  claimed: boolean
  multiplier: number // same as lockDuration for our protocol
}

// Lock Duration Options
export interface LockDurationOption {
  weeks: number
  multiplier: number
  label: string
  description: string
}

// Deployment Step Status
export interface DeploymentStep {
  id: string
  name: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  required: boolean
  contractAddress?: Address
  txHash?: string
}

// Network Configuration
export interface NetworkConfig {
  chainId: number
  name: string
  rpcUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

// Contract Addresses Configuration
export interface ContractAddresses {
  mockUSDC: Address
  proratedFactory: Address
  proswapFactory: Address
  proswapRouter: Address
  prolendFactory: Address
  tokenDeployer: Address
  pairDeployer: Address
  liquidityDeployer: Address
  veNFTDeployer: Address
  governorDeployer: Address
  treasuryDeployer: Address
  prolendDeployer: Address
}

// UI Component Props Types
export interface PoolCardProps {
  pool: PoolData
  showActions?: boolean
  compact?: boolean
}

export interface ContributionFormData {
  amount: string
  lockDuration: number
}

export interface DeploymentWizardProps {
  pool: PoolData
  onStepComplete: (stepId: string) => void
}

// API Response Types
export interface ApiResponse<T> {
  data: T
  error?: string
  loading: boolean
}

// Filter and Sort Types
export interface PoolFilters {
  status?: PoolStatus[]
  search?: string
  sortBy?: 'timeRemaining' | 'progress' | 'totalContributions' | 'created'
  sortOrder?: 'asc' | 'desc'
}

// Statistics Types
export interface ProtocolStats {
  totalPools: number
  totalFunding: bigint
  activePools: number
  launchedProjects: number
  totalUsers: number
}
