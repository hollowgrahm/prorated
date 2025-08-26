// Environment Configuration
// Uses auto-generated contract addresses from deployment script

import { CONTRACT_ADDRESSES, NETWORK_CONFIG, DEPLOYMENT_INFO } from './contracts-config'

interface EnvConfig {
  chainId: number
  rpcUrl: string
  rpcUrlBackup?: string
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
  deployment: {
    timestamp: string
    deployer: string
    blockNumber: string
  }
}

export const env: EnvConfig = {
  chainId: NETWORK_CONFIG.chainId,
  rpcUrl: NETWORK_CONFIG.rpcUrl,
  rpcUrlBackup: process.env.NEXT_PUBLIC_RPC_URL_BACKUP,
  
  contractAddresses: {
    mockUSDC: CONTRACT_ADDRESSES.mockUSDC,
    proratedFactory: CONTRACT_ADDRESSES.proratedFactory,
    proswapFactory: CONTRACT_ADDRESSES.proswapFactory,
    proswapRouter: CONTRACT_ADDRESSES.proswapRouter,
    prolendFactory: CONTRACT_ADDRESSES.prolendFactory,
    tokenDeployer: CONTRACT_ADDRESSES.tokenDeployer,
    pairDeployer: CONTRACT_ADDRESSES.pairDeployer,
    liquidityDeployer: CONTRACT_ADDRESSES.liquidityDeployer,
    veNFTDeployer: CONTRACT_ADDRESSES.veNFTDeployer,
    governorDeployer: CONTRACT_ADDRESSES.governorDeployer,
    treasuryDeployer: CONTRACT_ADDRESSES.treasuryDeployer,
    prolendDeployer: CONTRACT_ADDRESSES.prolendDeployer,
  },
  
  examplePools: {
    activePool: CONTRACT_ADDRESSES.activePool,
    upcomingPool: '', // Optional - can be added to CONTRACT_ADDRESSES if needed
    successfulPool: CONTRACT_ADDRESSES.successfulPool,
    endedSuccessfulPool: '', // Optional - can be added to CONTRACT_ADDRESSES if needed
  },
  
  app: {
    name: 'Prorated Protocol',
    description: 'Crowdfunding platform for launching tokens with integrated DEX, lending, and governance',
  },
  
  deployment: {
    timestamp: DEPLOYMENT_INFO.timestamp,
    deployer: DEPLOYMENT_INFO.deployer,
    blockNumber: DEPLOYMENT_INFO.blockNumber,
  },
}

// Validate environment at startup (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Environment Configuration:')
  console.log(`  Chain ID: ${env.chainId}`)
  console.log(`  Primary RPC: ${env.rpcUrl}`)
  if (env.rpcUrlBackup) {
    console.log(`  Backup RPC: ${env.rpcUrlBackup}`)
    console.log('  🔄 Fallback transport enabled for RPC redundancy')
  } else {
    console.log('  ⚠️  No backup RPC configured')
  }
  console.log(`  Factory: ${env.contractAddresses.proratedFactory}`)
  console.log('🔍 Environment Variables Debug:')
  console.log(`  NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS: ${process.env.NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS}`)
  console.log(`  NEXT_PUBLIC_RPC_URL_BACKUP: ${process.env.NEXT_PUBLIC_RPC_URL_BACKUP}`)
  console.log(`  All NEXT_PUBLIC vars:`, Object.keys(process.env).filter(key => key.startsWith('NEXT_PUBLIC')))
}
