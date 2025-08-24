// Contract Configurations and ABIs for Prorated Protocol
import { Address } from 'viem'
import { env } from './env'

// Contract Addresses from Environment
export const CONTRACTS = {
  mockUSDC: env.contractAddresses.mockUSDC as Address,
  proratedFactory: env.contractAddresses.proratedFactory as Address,
  proswapFactory: env.contractAddresses.proswapFactory as Address,
  proswapRouter: env.contractAddresses.proswapRouter as Address,
} as const

// Example Pool Addresses
export const EXAMPLE_POOLS = {
  activePool: env.examplePools.activePool as Address,
  upcomingPool: env.examplePools.upcomingPool as Address,
  successfulPool: env.examplePools.successfulPool as Address,
  endedSuccessfulPool: env.examplePools.endedSuccessfulPool as Address,
} as const

// Core Contract ABIs
export const PRORATED_FACTORY_ABI = [
  {
    type: "function",
    name: "allPools",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getAllPools",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address[]",
        internalType: "address[]"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPoolCount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'poolExists',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // State-changing functions
  {
    inputs: [
      {
        components: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'string', name: 'tokenName', type: 'string' },
          { internalType: 'string', name: 'tokenSymbol', type: 'string' },
          { internalType: 'uint256', name: 'tokenTotalSupply', type: 'uint256' },
          { internalType: 'uint256', name: 'developmentFund', type: 'uint256' },
          { internalType: 'uint256', name: 'liquidityFund', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'address', name: 'fundingToken', type: 'address' },
          { internalType: 'uint256', name: 'developerPercent', type: 'uint256' },
          { internalType: 'uint256', name: 'treasuryPercent', type: 'uint256' },
          { internalType: 'uint256', name: 'daoPercent', type: 'uint256' },
        ],
        internalType: 'struct ProratedPool.PoolConfig',
        name: 'config',
        type: 'tuple',
      },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
    ],
    name: 'createPool',
    outputs: [{ internalType: 'address', name: 'pool', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'pool', type: 'address' },
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: false, internalType: 'string', name: 'tokenName', type: 'string' },
      { indexed: false, internalType: 'string', name: 'tokenSymbol', type: 'string' },
    ],
    name: 'PoolCreated',
    type: 'event',
  },
] as const

export const PRORATED_POOL_ABI = [
  // View functions
  {
    inputs: [],
    name: 'getPoolData',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'string', name: 'tokenName', type: 'string' },
          { internalType: 'string', name: 'tokenSymbol', type: 'string' },
          { internalType: 'uint256', name: 'tokenTotalSupply', type: 'uint256' },
          { internalType: 'uint256', name: 'developmentFund', type: 'uint256' },
          { internalType: 'uint256', name: 'liquidityFund', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'address', name: 'fundingToken', type: 'address' },
          { internalType: 'uint256', name: 'developerPercent', type: 'uint256' },
          { internalType: 'uint256', name: 'treasuryPercent', type: 'uint256' },
          { internalType: 'uint256', name: 'daoPercent', type: 'uint256' },
        ],
        internalType: 'struct ProratedPool.PoolConfig',
        name: 'config',
        type: 'tuple',
      },
      { internalType: 'uint256', name: 'totalContributions', type: 'uint256' },
      { internalType: 'uint256', name: 'totalShares', type: 'uint256' },
      { internalType: 'uint256', name: 'minTotalContributions', type: 'uint256' },
      { internalType: 'address', name: 'proratedToken', type: 'address' },
      { internalType: 'address', name: 'proswapPair', type: 'address' },
      { internalType: 'address', name: 'proratedVeNFT', type: 'address' },
      { internalType: 'address', name: 'proratedGovernor', type: 'address' },
      { internalType: 'address', name: 'proratedTreasury', type: 'address' },
      { internalType: 'address', name: 'prolendPair80', type: 'address' },
      { internalType: 'address', name: 'prolendPair20', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalContributions',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'minTotalContributions',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'hasReachedMinimum',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserContribution',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'lockDuration', type: 'uint256' },
      { internalType: 'uint256', name: 'shares', type: 'uint256' },
      { internalType: 'bool', name: 'claimed', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // State-changing functions
  {
    inputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'lockDuration', type: 'uint256' },
    ],
    name: 'contribute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deployToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deployPair',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deployLiquidity',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deployVeNFT',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deployGovernor',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deployTreasury',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'deployProlend',
    outputs: [
      { internalType: 'address', name: 'pair80', type: 'address' },
      { internalType: 'address', name: 'pair20', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'lockDuration', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'shares', type: 'uint256' },
    ],
    name: 'Contribution',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'token', type: 'address' },
    ],
    name: 'TokenDeployed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'address', name: 'pair', type: 'address' },
    ],
    name: 'PairDeployed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [],
    name: 'LiquidityDeployed',
    type: 'event',
  },
] as const

export const MOCK_ERC20_ABI = [
  // Standard ERC20 functions
  {
    inputs: [],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'from', type: 'address' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // MockERC20 specific functions
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'from', type: 'address' },
      { indexed: true, internalType: 'address', name: 'to', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'owner', type: 'address' },
      { indexed: true, internalType: 'address', name: 'spender', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'value', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
] as const

export const PROSWAP_FACTORY_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'allPairs',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'allPairsLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
      { internalType: 'uint256', name: 'weightA', type: 'uint256' },
      { internalType: 'uint256', name: 'weightB', type: 'uint256' },
    ],
    name: 'createPair',
    outputs: [{ internalType: 'address', name: 'pair', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
      { internalType: 'uint256', name: 'weightA', type: 'uint256' },
      { internalType: 'uint256', name: 'weightB', type: 'uint256' },
    ],
    name: 'getPair',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export const PROSWAP_ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountADesired', type: 'uint256' },
      { internalType: 'uint256', name: 'amountBDesired', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
      { internalType: 'uint256', name: 'weightA', type: 'uint256' },
      { internalType: 'uint256', name: 'weightB', type: 'uint256' },
    ],
    name: 'addLiquidity',
    outputs: [
      { internalType: 'uint256', name: 'amountA', type: 'uint256' },
      { internalType: 'uint256', name: 'amountB', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

// Contract Configuration Objects
export const proratedFactoryConfig = {
  address: CONTRACTS.proratedFactory as Address,
  abi: PRORATED_FACTORY_ABI,
} as const

export const mockUSDCConfig = {
  address: CONTRACTS.mockUSDC as Address,
  abi: MOCK_ERC20_ABI,
} as const

export const proswapFactoryConfig = {
  address: CONTRACTS.proswapFactory as Address,
  abi: PROSWAP_FACTORY_ABI,
} as const

export const proswapRouterConfig = {
  address: CONTRACTS.proswapRouter as Address,
  abi: PROSWAP_ROUTER_ABI,
} as const

// Helper function to get pool contract config
export function getProratedPoolConfig(poolAddress: Address) {
  return {
    address: poolAddress,
    abi: PRORATED_POOL_ABI,
  } as const
}

// Helper function to get ERC20 contract config
export function getERC20Config(tokenAddress: Address) {
  return {
    address: tokenAddress,
    abi: MOCK_ERC20_ABI,
  } as const
}
