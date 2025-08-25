#!/usr/bin/env node

/**
 * Updates the frontend contract configuration file with deployed addresses
 * This script is called by the deployment script to ensure frontend always has current addresses
 */

const fs = require('fs');
const path = require('path');

// Read addresses from the .env.local file
function readEnvFile() {
  const envPath = path.join(__dirname, '../frontend/.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found at:', envPath);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const addresses = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, value] = trimmed.split('=');
      if (key && value) {
        addresses[key.trim()] = value.trim();
      }
    }
  });

  return addresses;
}

// Generate the TypeScript config file
function generateConfigFile(addresses) {
  const timestamp = new Date().toISOString();
  const deployer = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // Default Anvil account
  
  const configContent = `// Auto-generated contract addresses
// This file is automatically updated by the deployment script
// DO NOT EDIT MANUALLY - changes will be overwritten

export const CONTRACT_ADDRESSES = {
  // Core contracts
  mockUSDC: '${addresses.NEXT_PUBLIC_MOCK_USDC_ADDRESS}',
  proratedFactory: '${addresses.NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS}',
  
  // Proswap contracts
  proswapFactory: '${addresses.NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS}',
  proswapRouter: '${addresses.NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS}',
  
  // Prolend contracts
  prolendFactory: '${addresses.NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS}',
  
  // Deployer contracts
  tokenDeployer: '${addresses.NEXT_PUBLIC_TOKEN_DEPLOYER_ADDRESS}',
  pairDeployer: '${addresses.NEXT_PUBLIC_PAIR_DEPLOYER_ADDRESS}',
  liquidityDeployer: '${addresses.NEXT_PUBLIC_LIQUIDITY_DEPLOYER_ADDRESS}',
  veNFTDeployer: '${addresses.NEXT_PUBLIC_VENFT_DEPLOYER_ADDRESS}',
  governorDeployer: '${addresses.NEXT_PUBLIC_GOVERNOR_DEPLOYER_ADDRESS}',
  treasuryDeployer: '${addresses.NEXT_PUBLIC_TREASURY_DEPLOYER_ADDRESS}',
  prolendDeployer: '${addresses.NEXT_PUBLIC_PROLEND_DEPLOYER_ADDRESS}',
  
  // Example pools
  activePool: '${addresses.NEXT_PUBLIC_ACTIVE_POOL_ADDRESS}',
  successfulPool: '${addresses.NEXT_PUBLIC_SUCCESSFUL_POOL_ADDRESS}',
  launchedPool: '${addresses.NEXT_PUBLIC_LAUNCHED_POOL_ADDRESS}',
} as const

export const NETWORK_CONFIG = {
  chainId: 31337,
  rpcUrl: 'http://localhost:8545',
  name: 'Anvil Local',
} as const

// Deployment metadata
export const DEPLOYMENT_INFO = {
  timestamp: '${timestamp}',
  deployer: '${deployer}',
  blockNumber: 'latest',
} as const`;

  return configContent;
}

// Main function
function main() {
  console.log('🔄 Updating frontend contract configuration...');
  
  try {
    // Read addresses from .env.local
    const addresses = readEnvFile();
    
    // Validate required addresses
    const requiredAddresses = [
      'NEXT_PUBLIC_MOCK_USDC_ADDRESS',
      'NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS',
      'NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS',
      'NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS',
      'NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS',
      'NEXT_PUBLIC_TOKEN_DEPLOYER_ADDRESS',
      'NEXT_PUBLIC_PAIR_DEPLOYER_ADDRESS',
      'NEXT_PUBLIC_LIQUIDITY_DEPLOYER_ADDRESS',
      'NEXT_PUBLIC_VENFT_DEPLOYER_ADDRESS',
      'NEXT_PUBLIC_GOVERNOR_DEPLOYER_ADDRESS',
      'NEXT_PUBLIC_TREASURY_DEPLOYER_ADDRESS',
      'NEXT_PUBLIC_PROLEND_DEPLOYER_ADDRESS',
      'NEXT_PUBLIC_ACTIVE_POOL_ADDRESS',
      'NEXT_PUBLIC_SUCCESSFUL_POOL_ADDRESS',
    ];

    const missing = requiredAddresses.filter(addr => !addresses[addr]);
    if (missing.length > 0) {
      console.error('❌ Missing required addresses:', missing);
      process.exit(1);
    }

    // Generate config file content
    const configContent = generateConfigFile(addresses);
    
    // Write to frontend config file
    const configPath = path.join(__dirname, '../frontend/src/lib/contracts-config.ts');
    fs.writeFileSync(configPath, configContent, 'utf8');
    
    console.log('✅ Frontend contract configuration updated successfully!');
    console.log(`📁 Config file: ${configPath}`);
    console.log(`🏭 Factory: ${addresses.NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS}`);
    console.log(`💰 MockUSDC: ${addresses.NEXT_PUBLIC_MOCK_USDC_ADDRESS}`);
    console.log(`🎯 Active Pool: ${addresses.NEXT_PUBLIC_ACTIVE_POOL_ADDRESS}`);
    
  } catch (error) {
    console.error('❌ Error updating frontend config:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, readEnvFile, generateConfigFile };
