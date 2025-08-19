// Prorated Protocol Constants

import { LockDurationOption, ContractAddresses, NetworkConfig } from '@/types'

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

// Contract Addresses for Local Development (Anvil)
export const CONTRACT_ADDRESSES: ContractAddresses = {
  mockUSDC: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  proratedFactory: '0x9A676e781A523b5d0C0e43731313A708CB607508',
  proswapFactory: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
  proswapRouter: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  prolendFactory: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
  tokenDeployer: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  pairDeployer: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
  liquidityDeployer: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318',
  veNFTDeployer: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788',
  governorDeployer: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
  treasuryDeployer: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
  prolendDeployer: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
}

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

// Example Pool Addresses (from deployment)
export const EXAMPLE_POOLS = {
  activePool: '0xfafAcEDF7f87058Ed51a075E66Df97e0e7B5780D',
  upcomingPool: '0x98a7A480a3b078f5DeB5B4dd2ee1873ECf9bF2b6',
  successfulPool: '0x52be44C75fB09cBceF6dD0044Ed08f60a9af90fc',
  endedSuccessfulPool: '0xe93066d51126d444Ca451521c3a127f521E15eD3',
}

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
