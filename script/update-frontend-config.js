#!/usr/bin/env node

/**
 * Updates the frontend contract configuration file with deployed addresses
 * This script is called by the deployment script to ensure frontend always has current addresses
 */

const fs = require('fs');
const path = require('path');

// Read addresses from environment file or broadcast data
function readAddresses(network = 'anvil', broadcastFile = null) {
  let addresses = {};
  
  if (network === 'hyperliquid' && broadcastFile) {
    // Read from Foundry broadcast file for Hyperliquid
    console.log('📄 Reading addresses from broadcast file:', broadcastFile);
    const broadcastData = JSON.parse(fs.readFileSync(broadcastFile, 'utf8'));
    
    // Extract contract addresses from broadcast transactions
    broadcastData.transactions.forEach(tx => {
      if (tx.contractName && tx.contractAddress) {
        const envKey = contractNameToEnvKey(tx.contractName);
        if (envKey) {
          addresses[envKey] = tx.contractAddress;
        }
      }
    });
  } else {
    // Read from .env.local file for Anvil
    const envPath = path.join(__dirname, '../frontend/.env.local');
    if (!fs.existsSync(envPath)) {
      console.error('❌ .env.local file not found at:', envPath);
      process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, value] = trimmed.split('=');
        if (key && value) {
          addresses[key.trim()] = value.trim();
        }
      }
    });
  }

  return addresses;
}

// Map contract names to environment variable keys
function contractNameToEnvKey(contractName) {
  const mapping = {
    'MockUSDC': 'NEXT_PUBLIC_MOCK_USDC_ADDRESS',
    'ProratedFactory': 'NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS',
    'ProswapFactory': 'NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS',
    'ProswapRouter': 'NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS',
    'ProlendFactory': 'NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS',
    'TokenDeployer': 'NEXT_PUBLIC_TOKEN_DEPLOYER_ADDRESS',
    'PairDeployer': 'NEXT_PUBLIC_PAIR_DEPLOYER_ADDRESS',
    'LiquidityDeployer': 'NEXT_PUBLIC_LIQUIDITY_DEPLOYER_ADDRESS',
    'VeNFTDeployer': 'NEXT_PUBLIC_VENFT_DEPLOYER_ADDRESS',
    'GovernorDeployer': 'NEXT_PUBLIC_GOVERNOR_DEPLOYER_ADDRESS',
    'TreasuryDeployer': 'NEXT_PUBLIC_TREASURY_DEPLOYER_ADDRESS',
    'ProlendDeployer': 'NEXT_PUBLIC_PROLEND_DEPLOYER_ADDRESS',
  };
  return mapping[contractName];
}

// Generate the TypeScript config file
function generateConfigFile(addresses, network = 'anvil') {
  const timestamp = new Date().toISOString();
  const deployer = network === 'hyperliquid' ? 'Your Hyperliquid Wallet' : '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  
  const networkConfig = network === 'hyperliquid' ? {
    chainId: 998,
    rpcUrl: 'https://rpc.hyperliquid-testnet.xyz/evm',
    name: 'Hyperliquid Testnet',
  } : {
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    name: 'Anvil Local',
  };
  
  const configContent = `// Auto-generated contract addresses
// This file is automatically updated by the deployment script
// DO NOT EDIT MANUALLY - changes will be overwritten
// Network: ${networkConfig.name}

export const CONTRACT_ADDRESSES = {
  // Core contracts
  mockUSDC: '${addresses.NEXT_PUBLIC_MOCK_USDC_ADDRESS || ''}',
  proratedFactory: '${addresses.NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS || ''}',
  
  // Proswap contracts
  proswapFactory: '${addresses.NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS || ''}',
  proswapRouter: '${addresses.NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS || ''}',
  
  // Prolend contracts
  prolendFactory: '${addresses.NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS || ''}',
  
  // Deployer contracts
  tokenDeployer: '${addresses.NEXT_PUBLIC_TOKEN_DEPLOYER_ADDRESS || ''}',
  pairDeployer: '${addresses.NEXT_PUBLIC_PAIR_DEPLOYER_ADDRESS || ''}',
  liquidityDeployer: '${addresses.NEXT_PUBLIC_LIQUIDITY_DEPLOYER_ADDRESS || ''}',
  veNFTDeployer: '${addresses.NEXT_PUBLIC_VENFT_DEPLOYER_ADDRESS || ''}',
  governorDeployer: '${addresses.NEXT_PUBLIC_GOVERNOR_DEPLOYER_ADDRESS || ''}',
  treasuryDeployer: '${addresses.NEXT_PUBLIC_TREASURY_DEPLOYER_ADDRESS || ''}',
  prolendDeployer: '${addresses.NEXT_PUBLIC_PROLEND_DEPLOYER_ADDRESS || ''}',
  
  // Example pools
  activePool: '${addresses.NEXT_PUBLIC_ACTIVE_POOL_ADDRESS || ''}',
  successfulPool: '${addresses.NEXT_PUBLIC_SUCCESSFUL_POOL_ADDRESS || ''}',
  launchedPool: '${addresses.NEXT_PUBLIC_LAUNCHED_POOL_ADDRESS || ''}',
} as const

export const NETWORK_CONFIG = {
  chainId: ${networkConfig.chainId},
  rpcUrl: '${networkConfig.rpcUrl}',
  name: '${networkConfig.name}',
} as const

// Deployment metadata
export const DEPLOYMENT_INFO = {
  timestamp: '${timestamp}',
  deployer: '${deployer}',
  network: '${network}',
  blockNumber: 'latest',
} as const`;

  return configContent;
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const network = args[0] || 'anvil';
  const broadcastFile = args[1] || null;
  
  console.log(`🔄 Updating frontend contract configuration for ${network}...`);
  
  try {
    // Read addresses based on network
    const addresses = readAddresses(network, broadcastFile);
    
    // Core required addresses (always needed)
    const coreRequiredAddresses = [
      'NEXT_PUBLIC_MOCK_USDC_ADDRESS',
      'NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS',
      'NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS',
      'NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS',
      'NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS',
    ];

    // Check for missing core addresses
    const missing = coreRequiredAddresses.filter(addr => !addresses[addr]);
    if (missing.length > 0) {
      console.warn('⚠️  Missing some addresses (may be expected for partial deployments):', missing);
    }

    // Generate config file content
    const configContent = generateConfigFile(addresses, network);
    
    // Write to frontend config file
    const configPath = path.join(__dirname, '../frontend/src/lib/contracts-config.ts');
    fs.writeFileSync(configPath, configContent, 'utf8');
    
    console.log('✅ Frontend contract configuration updated successfully!');
    console.log(`📁 Config file: ${configPath}`);
    console.log(`🌐 Network: ${network}`);
    console.log(`🏭 Factory: ${addresses.NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS || 'Not deployed'}`);
    console.log(`💰 MockUSDC: ${addresses.NEXT_PUBLIC_MOCK_USDC_ADDRESS || 'Not deployed'}`);
    
  } catch (error) {
    console.error('❌ Error updating frontend config:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, readAddresses, generateConfigFile };
