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
    prolendFactory: string
    tokenDeployer: string
    pairDeployer: string
    liquidityDeployer: string
    veNFTDeployer: string
    governorDeployer: string
    treasuryDeployer: string
    prolendDeployer: string
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
    proratedFactory: getEnvVar('NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS', '0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2'),
    proswapFactory: getEnvVar('NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS', '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'),
    proswapRouter: getEnvVar('NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS', '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707'),
    prolendFactory: getEnvVar('NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS', '0x0165878A594ca255338adfa4d48449f69242Eb8F'),
    tokenDeployer: getEnvVar('NEXT_PUBLIC_TOKEN_DEPLOYER_ADDRESS', '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853'),
    pairDeployer: getEnvVar('NEXT_PUBLIC_PAIR_DEPLOYER_ADDRESS', '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6'),
    liquidityDeployer: getEnvVar('NEXT_PUBLIC_LIQUIDITY_DEPLOYER_ADDRESS', '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318'),
    veNFTDeployer: getEnvVar('NEXT_PUBLIC_VENFT_DEPLOYER_ADDRESS', '0x610178dA211FEF7D417bC0e6FeD39F05609AD788'),
    governorDeployer: getEnvVar('NEXT_PUBLIC_GOVERNOR_DEPLOYER_ADDRESS', '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e'),
    treasuryDeployer: getEnvVar('NEXT_PUBLIC_TREASURY_DEPLOYER_ADDRESS', '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0'),
    prolendDeployer: getEnvVar('NEXT_PUBLIC_PROLEND_DEPLOYER_ADDRESS', '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82'),
  },
  
  examplePools: {
    activePool: getEnvVarOptional('NEXT_PUBLIC_ACTIVE_POOL', '0xcAdC354Cb40F540bF5115bb59b3B9bb0eFaf85b7'),
    upcomingPool: getEnvVarOptional('NEXT_PUBLIC_UPCOMING_POOL', '0xC846fDBd0078fff170ea48a81ec08B5800D7D7BB'),
    successfulPool: getEnvVarOptional('NEXT_PUBLIC_SUCCESSFUL_POOL', '0x22690b994Fa02A604aC7b13609Ba6F91aAcf7362'),
    endedSuccessfulPool: getEnvVarOptional('NEXT_PUBLIC_ENDED_SUCCESSFUL_POOL', '0x2De873727E3Bf366b0D563B89aaAfD9dC2eAD21a'),
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
  console.log('🔍 Environment Variables Debug:')
  console.log(`  NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS: ${process.env.NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS}`)
  console.log(`  All NEXT_PUBLIC vars:`, Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')))
}
