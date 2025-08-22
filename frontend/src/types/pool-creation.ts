export interface PoolCreationFormData {
  // Step 1: Token Configuration
  tokenName: string
  tokenSymbol: string
  tokenTotalSupply: number
  
  // Step 2: Funding Parameters
  developmentFund: number
  liquidityFund: number
  fundingToken: string // Address of funding token (USDC, USDT, etc.)
  startTime: Date
  endTime: Date
  
  // Step 3: Allocation Parameters
  developerPercent: number
  treasuryPercent: number
  daoPercent: number
  
  // Step 4: Additional Settings
  description: string
  salt: string // For CREATE2 deployment
}

export interface PoolCreationStep {
  id: string
  title: string
  description: string
  component: React.ComponentType<PoolCreationStepProps>
  isValid: (data: Partial<PoolCreationFormData>) => boolean
}

export interface PoolCreationStepProps {
  data: Partial<PoolCreationFormData>
  onUpdate: (updates: Partial<PoolCreationFormData>) => void
  onNext: () => void
  onPrevious: () => void
  isValid: boolean
  isFirst: boolean
  isLast: boolean
}

export interface ValidationErrors {
  [key: string]: string
}

// Common funding token options
export const FUNDING_TOKENS = [
  {
    address: '0xA0b86a33E6411c88f7f3A3c4D79F85B8b52E8e',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6
  },
  {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6
  },
  {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18
  },
  {
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18
  }
]

// Validation constants from smart contract
export const VALIDATION_RULES = {
  tokenName: {
    minLength: 1,
    maxLength: 50
  },
  tokenSymbol: {
    minLength: 1,
    maxLength: 10
  },
  tokenTotalSupply: {
    min: 1,
    max: Number.MAX_SAFE_INTEGER
  },
  developmentFund: {
    min: 1000,
    max: 10_000_000
  },
  liquidityFund: {
    min: 1000,
    max: 10_000_000
  },
  percentages: {
    total: 100,
    min: 1,
    max: 99
  },
  timeRange: {
    minDuration: 1, // 1 day
    maxDuration: 30, // 30 days
    maxStartDelay: 30 // 30 days from now
  }
}
