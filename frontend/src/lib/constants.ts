// Prorated Protocol Constants

import { LockDurationOption, NetworkConfig } from '@/types'
import { env } from './env'

// Lock Duration Options (1-208 weeks with multipliers)
export const LOCK_DURATION_OPTIONS: LockDurationOption[] = [
  { weeks: 1, multiplier: 1, label: '1 Week', description: '1x multiplier' },
  { weeks: 4, multiplier: 4, label: '1 Month', description: '4x multiplier' },
  { weeks: 12, multiplier: 12, label: '3 Months', description: '12x multiplier' },
  { weeks: 26, multiplier: 26, label: '6 Months', description: '26x multiplier' },
  { weeks: 52, multiplier: 52, label: '1 Year', description: '52x multiplier' },
  { weeks: 104, multiplier: 104, label: '2 Years', description: '104x multiplier' },
  { weeks: 156, multiplier: 156, label: '3 Years', description: '156x multiplier' },
  { weeks: 208, multiplier: 208, label: '4 Years', description: '208x multiplier (MAX)' },
]

// Contract Addresses from Environment Configuration
export const CONTRACT_ADDRESSES = env.contractAddresses

// Network Configuration for Local Development
export const ANVIL_NETWORK: NetworkConfig = {
  chainId: 31337,
  name: 'Anvil Local',
  rpcUrl: 'http://localhost:8545',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
}

// Example Pool Addresses from Environment Configuration
export const EXAMPLE_POOLS = env.examplePools

// Deployment Steps Configuration
export const DEPLOYMENT_STEPS = [
  {
    id: 'token',
    name: 'Deploy Token',
    description: 'Create the ERC20 token for the project',
    required: true,
  },
  {
    id: 'pair',
    name: 'Deploy Trading Pair',
    description: 'Create the Proswap 80/20 weighted pool',
    required: true,
  },
  {
    id: 'liquidity',
    name: 'Seed Liquidity',
    description: 'Add initial liquidity to the trading pair',
    required: true,
  },
  {
    id: 'venft',
    name: 'Deploy veNFT',
    description: 'Enable governance voting power NFTs',
    required: false,
  },
  {
    id: 'governor',
    name: 'Deploy Governor',
    description: 'Create the DAO governance contract',
    required: false,
  },
  {
    id: 'treasury',
    name: 'Deploy Treasury',
    description: 'Set up the community treasury',
    required: false,
  },
  {
    id: 'prolend',
    name: 'Deploy Lending',
    description: 'Create Prolend lending markets',
    required: false,
  },
]

// Pool Status Labels and Colors
export const POOL_STATUS_CONFIG = {
  upcoming: {
    label: 'Upcoming',
    color: 'blue',
    description: 'Pool has not started yet',
  },
  active: {
    label: 'Active',
    color: 'green',
    description: 'Currently accepting contributions',
  },
  failed: {
    label: 'Failed',
    color: 'red',
    description: 'Did not reach minimum funding',
  },
  'success-pending': {
    label: 'Success - Deploy Ready',
    color: 'yellow',
    description: 'Ready for deployment',
  },
  deploying: {
    label: 'Deploying',
    color: 'purple',
    description: 'Deployment in progress',
  },
  launched: {
    label: 'Launched',
    color: 'green',
    description: 'Fully deployed and operational',
  },
}

// Time Constants
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
}

// Default Values
export const DEFAULTS = {
  REFRESH_INTERVAL: 30000, // 30 seconds
  PAGINATION_SIZE: 12,
  MIN_CONTRIBUTION_AMOUNT: BigInt(1000000), // 1 USDC (6 decimals)
  MAX_LOCK_DURATION: 208, // weeks
  MIN_LOCK_DURATION: 1, // week
}
