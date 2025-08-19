// Environment Configuration
// Note: Create a .env.local file with these variables for local development

interface EnvConfig {
  chainId: number
  rpcUrl: string
  contractAddresses: {
    mockUSDC: string
    proratedFactory: string
    proswapFactory: string
    proswapRouter: string
  }
  examplePools: {
    activePool: string
    upcomingPool: string
    successfulPool: string
    endedSuccessfulPool: string
  }
  app: {
    name: string
    description: string
  }
}

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`)
  }
  return value
}

function getEnvVarOptional(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue
}

export const env: EnvConfig = {
  chainId: parseInt(getEnvVar('NEXT_PUBLIC_CHAIN_ID', '31337'), 10),
  rpcUrl: getEnvVar('NEXT_PUBLIC_RPC_URL', 'http://localhost:8545'),
  
  contractAddresses: {
    mockUSDC: getEnvVar('NEXT_PUBLIC_MOCK_USDC_ADDRESS', '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0'),
    proratedFactory: getEnvVar('NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS', '0x9A676e781A523b5d0C0e43731313A708CB607508'),
    proswapFactory: getEnvVar('NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS', '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'),
    proswapRouter: getEnvVar('NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS', '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707'),
  },
  
  examplePools: {
    activePool: getEnvVarOptional('NEXT_PUBLIC_ACTIVE_POOL', '0xfafAcEDF7f87058Ed51a075E66Df97e0e7B5780D'),
    upcomingPool: getEnvVarOptional('NEXT_PUBLIC_UPCOMING_POOL', '0x98a7A480a3b078f5DeB5B4dd2ee1873ECf9bF2b6'),
    successfulPool: getEnvVarOptional('NEXT_PUBLIC_SUCCESSFUL_POOL', '0x52be44C75fB09cBceF6dD0044Ed08f60a9af90fc'),
    endedSuccessfulPool: getEnvVarOptional('NEXT_PUBLIC_ENDED_SUCCESSFUL_POOL', '0xe93066d51126d444Ca451521c3a127f521E15eD3'),
  },
  
  app: {
    name: getEnvVar('NEXT_PUBLIC_APP_NAME', 'Prorated Protocol'),
    description: getEnvVar('NEXT_PUBLIC_APP_DESCRIPTION', 'Crowdfunding platform for launching tokens with integrated DEX, lending, and governance'),
  },
}

// Validate environment at startup (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Environment Configuration:')
  console.log(`  Chain ID: ${env.chainId}`)
  console.log(`  RPC URL: ${env.rpcUrl}`)
  console.log(`  Factory: ${env.contractAddresses.proratedFactory}`)
}
