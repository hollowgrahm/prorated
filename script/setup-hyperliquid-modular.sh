#!/bin/bash

# Hyperliquid Testnet Deployment Script (Modular)
# This script deploys the Prorated Protocol to Hyperliquid testnet in sequential steps

set -e  # Exit on any error

echo "🚀 Starting Hyperliquid Testnet Deployment (Modular Approach)"
echo "============================================================"

# Load environment variables
if [ ! -f .env.hyperliquid ]; then
    echo "❌ Error: .env.hyperliquid file not found!"
    echo "Please create .env.hyperliquid with your HYPERLIQUID_PRIVATE_KEY"
    exit 1
fi

source .env.hyperliquid

if [ -z "$HYPERLIQUID_PRIVATE_KEY" ]; then
    echo "❌ Error: HYPERLIQUID_PRIVATE_KEY not set in .env.hyperliquid"
    exit 1
fi

# Set RPC URL
export HYPERLIQUID_RPC_URL="https://rpc.hyperliquid-testnet.xyz/evm"

# Using big blocks for deployment (as confirmed)
echo "⚡ Using BIG BLOCKS for deployment..."

# Common forge script parameters
FORGE_PARAMS="--rpc-url $HYPERLIQUID_RPC_URL --private-key $HYPERLIQUID_PRIVATE_KEY --broadcast --slow --with-gas-price 1000000000 --gas-limit 100000000 -vvv"

echo ""
echo "📋 Deployment Plan:"
echo "  1. Deploy Core Infrastructure (MockUSDC, Proswap, Prolend)"
echo "  2. Deploy Deployer Contracts (Token, Pair, Liquidity, etc.)"
echo "  3. Deploy Prorated Factory"
echo "  4. Create Demo Pools (Active, Failed, Success, Launched)"
echo "  5. Fund Demo Pools (realistic funding levels)"
echo "  6. Deploy Launched Pool Ecosystem (Token, Pair, VeNFT, etc.)"
echo "  7. Update Frontend Configuration"
echo ""

# Step 1: Deploy Core Infrastructure
echo "🔧 Step 1/6: Deploying Core Infrastructure..."
INFRA_OUTPUT=$(forge script script/hyperliquid/01_DeployInfrastructure.s.sol:DeployInfrastructure $FORGE_PARAMS 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Infrastructure deployment failed!"
    echo "$INFRA_OUTPUT"
    exit 1
fi

# Extract addresses from output
MOCK_USDC=$(echo "$INFRA_OUTPUT" | grep "NEXT_PUBLIC_MOCK_USDC_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')
PROSWAP_FACTORY=$(echo "$INFRA_OUTPUT" | grep "NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')
PROSWAP_ROUTER=$(echo "$INFRA_OUTPUT" | grep "NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')
PROLEND_FACTORY=$(echo "$INFRA_OUTPUT" | grep "NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')

echo "✅ Infrastructure deployed:"
echo "   MockUSDC: $MOCK_USDC"
echo "   ProswapFactory: $PROSWAP_FACTORY"
echo "   ProswapRouter: $PROSWAP_ROUTER"
echo "   ProlendFactory: $PROLEND_FACTORY"

# Step 2: Deploy Deployer Contracts
echo ""
echo "🔧 Step 2/6: Deploying Deployer Contracts..."
DEPLOYERS_OUTPUT=$(forge script script/hyperliquid/02_DeployDeployers.s.sol:DeployDeployers $FORGE_PARAMS --sig "run(address,address,address)" $PROSWAP_FACTORY $PROSWAP_ROUTER $PROLEND_FACTORY 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Deployers deployment failed!"
    echo "$DEPLOYERS_OUTPUT"
    exit 1
fi

# Extract deployer addresses
TOKEN_DEPLOYER=$(echo "$DEPLOYERS_OUTPUT" | grep "NEXT_PUBLIC_TOKEN_DEPLOYER_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')
PAIR_DEPLOYER=$(echo "$DEPLOYERS_OUTPUT" | grep "NEXT_PUBLIC_PAIR_DEPLOYER_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')
LIQUIDITY_DEPLOYER=$(echo "$DEPLOYERS_OUTPUT" | grep "NEXT_PUBLIC_LIQUIDITY_DEPLOYER_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')
VENFT_DEPLOYER=$(echo "$DEPLOYERS_OUTPUT" | grep "NEXT_PUBLIC_VENFT_DEPLOYER_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')
GOVERNOR_DEPLOYER=$(echo "$DEPLOYERS_OUTPUT" | grep "NEXT_PUBLIC_GOVERNOR_DEPLOYER_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')
TREASURY_DEPLOYER=$(echo "$DEPLOYERS_OUTPUT" | grep "NEXT_PUBLIC_TREASURY_DEPLOYER_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')
PROLEND_DEPLOYER=$(echo "$DEPLOYERS_OUTPUT" | grep "NEXT_PUBLIC_PROLEND_DEPLOYER_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')

echo "✅ Deployers deployed:"
echo "   TokenDeployer: $TOKEN_DEPLOYER"
echo "   PairDeployer: $PAIR_DEPLOYER"
echo "   LiquidityDeployer: $LIQUIDITY_DEPLOYER"
echo "   VeNFTDeployer: $VENFT_DEPLOYER"
echo "   GovernorDeployer: $GOVERNOR_DEPLOYER"
echo "   TreasuryDeployer: $TREASURY_DEPLOYER"
echo "   ProlendDeployer: $PROLEND_DEPLOYER"

# Step 3: Deploy Factory
echo ""
echo "🔧 Step 3/6: Deploying Prorated Factory..."
FACTORY_OUTPUT=$(forge script script/hyperliquid/03_DeployFactory.s.sol:DeployFactory $FORGE_PARAMS --sig "run(address,address,address,address,address,address,address,address,address)" $PROSWAP_FACTORY $PROSWAP_ROUTER $TOKEN_DEPLOYER $PAIR_DEPLOYER $LIQUIDITY_DEPLOYER $VENFT_DEPLOYER $GOVERNOR_DEPLOYER $TREASURY_DEPLOYER $PROLEND_DEPLOYER 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Factory deployment failed!"
    echo "$FACTORY_OUTPUT"
    exit 1
fi

PRORATED_FACTORY=$(echo "$FACTORY_OUTPUT" | grep "NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS=" | cut -d'=' -f2 | tr -d ' ')

echo "✅ Factory deployed:"
echo "   ProratedFactory: $PRORATED_FACTORY"

# Step 4: Create Demo Pools
echo ""
echo "🔧 Step 4/6: Creating Demo Pools..."
POOLS_OUTPUT=$(forge script script/hyperliquid/04_CreateDemoPools.s.sol:CreateDemoPools $FORGE_PARAMS --sig "run(address,address)" $PRORATED_FACTORY $MOCK_USDC 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Demo pools creation failed!"
    echo "$POOLS_OUTPUT"
    exit 1
fi

# Extract pool addresses
DEMO_ACTIVE_POOL=$(echo "$POOLS_OUTPUT" | grep "DEMO_ACTIVE_POOL=" | cut -d'=' -f2 | tr -d ' ')
DEMO_FAILED_POOL=$(echo "$POOLS_OUTPUT" | grep "DEMO_FAILED_POOL=" | cut -d'=' -f2 | tr -d ' ')
DEMO_SUCCESS_POOL=$(echo "$POOLS_OUTPUT" | grep "DEMO_SUCCESS_POOL=" | cut -d'=' -f2 | tr -d ' ')
DEMO_LAUNCHED_POOL=$(echo "$POOLS_OUTPUT" | grep "DEMO_LAUNCHED_POOL=" | cut -d'=' -f2 | tr -d ' ')

echo "✅ Demo pools created:"
echo "   Active Pool: $DEMO_ACTIVE_POOL"
echo "   Failed Pool: $DEMO_FAILED_POOL"
echo "   Success Pool: $DEMO_SUCCESS_POOL"
echo "   Launched Pool: $DEMO_LAUNCHED_POOL"

# Step 5: Fund Demo Pools
echo ""
echo "🔧 Step 5/6: Funding Demo Pools..."
FUNDING_OUTPUT=$(forge script script/hyperliquid/05_FundDemoPools.s.sol:FundDemoPools $FORGE_PARAMS --sig "run(address,address,address,address,address)" $MOCK_USDC $DEMO_ACTIVE_POOL $DEMO_FAILED_POOL $DEMO_SUCCESS_POOL $DEMO_LAUNCHED_POOL 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Demo pools funding failed!"
    echo "$FUNDING_OUTPUT"
    exit 1
fi

echo "✅ Demo pools funded with realistic amounts"

# Step 6: Deploy Launched Pool Ecosystem
echo ""
echo "🔧 Step 6/6: Deploying Launched Pool Ecosystem..."
ECOSYSTEM_OUTPUT=$(forge script script/hyperliquid/06_DeployLaunchedEcosystem.s.sol:DeployLaunchedEcosystem $FORGE_PARAMS --sig "run(address)" $DEMO_LAUNCHED_POOL 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ Launched pool ecosystem deployment failed!"
    echo "$ECOSYSTEM_OUTPUT"
    exit 1
fi

echo "✅ Launched pool ecosystem deployed"

# Step 7: Update Frontend Configuration
echo ""
echo "🔧 Step 7/7: Updating Frontend Configuration..."

# Write environment variables to frontend/.env.local
cat > frontend/.env.local << EOF
NEXT_PUBLIC_MOCK_USDC_ADDRESS=$MOCK_USDC
NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS=$PROSWAP_FACTORY
NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS=$PROSWAP_ROUTER
NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS=$PROLEND_FACTORY
NEXT_PUBLIC_TOKEN_DEPLOYER_ADDRESS=$TOKEN_DEPLOYER
NEXT_PUBLIC_PAIR_DEPLOYER_ADDRESS=$PAIR_DEPLOYER
NEXT_PUBLIC_LIQUIDITY_DEPLOYER_ADDRESS=$LIQUIDITY_DEPLOYER
NEXT_PUBLIC_VENFT_DEPLOYER_ADDRESS=$VENFT_DEPLOYER
NEXT_PUBLIC_GOVERNOR_DEPLOYER_ADDRESS=$GOVERNOR_DEPLOYER
NEXT_PUBLIC_TREASURY_DEPLOYER_ADDRESS=$TREASURY_DEPLOYER
NEXT_PUBLIC_PROLEND_DEPLOYER_ADDRESS=$PROLEND_DEPLOYER
NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS=$PRORATED_FACTORY
EOF

# Update frontend configuration
node script/update-frontend-config.js hyperliquid

echo "✅ Frontend configuration updated"

echo ""
echo "🎉 HYPERLIQUID TESTNET DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "📊 Deployment Summary:"
echo "   Network: Hyperliquid Testnet (Chain ID: 998)"
echo "   Factory: $PRORATED_FACTORY"
echo "   Demo Pools: 4 pools with realistic funding"
echo "   Launched Pool: Full ecosystem deployed"
echo ""
echo "🌐 Your Prorated Protocol is now live on Hyperliquid testnet!"
echo "   Connect your wallet to Chain ID 998 to interact with the demo"
echo ""
