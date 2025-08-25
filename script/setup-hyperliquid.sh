#!/bin/bash

# Hyperliquid Testnet Deployment Script
# This script deploys the Prorated Protocol to Hyperliquid testnet

set -e  # Exit on any error

echo "🚀 Starting Hyperliquid Testnet Deployment..."

# Check if .env.hyperliquid exists
if [ ! -f ".env.hyperliquid" ]; then
    echo "❌ Error: .env.hyperliquid file not found!"
    echo "📝 Please copy .env.hyperliquid.example to .env.hyperliquid and fill in your private key"
    exit 1
fi

# Load environment variables
source .env.hyperliquid

# Validate required variables
if [ -z "$HYPERLIQUID_PRIVATE_KEY" ]; then
    echo "❌ Error: HYPERLIQUID_PRIVATE_KEY not set in .env.hyperliquid"
    exit 1
fi

echo "🔗 Network: Hyperliquid Testnet (Chain ID: 998)"
echo "🌐 RPC: $HYPERLIQUID_RPC_URL"
echo "🔍 Explorer: $HYPERLIQUID_EXPLORER_URL"

# Using big blocks for deployment (as confirmed)
echo "⚡ Using BIG BLOCKS for deployment..."

# Deploy contracts using Foundry with Hyperliquid profile
echo "📦 Deploying contracts to Hyperliquid testnet..."

# Create deployment script for Hyperliquid
forge script script/DeployDemo.s.sol:DeployDemo \
    --rpc-url $HYPERLIQUID_RPC_URL \
    --private-key $HYPERLIQUID_PRIVATE_KEY \
    --broadcast \
    --verify \
    --slow \
    --with-gas-price 1000000000 \
    --gas-limit 100000000 \
    -vvv

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    
    # Parse deployment output and update frontend config
    echo "📝 Updating frontend configuration..."
    
    # Extract contract addresses from broadcast files
    BROADCAST_DIR="broadcast/DeployDemo.s.sol/998"
    if [ -d "$BROADCAST_DIR" ]; then
        # Find the latest run file
        LATEST_RUN=$(ls -t $BROADCAST_DIR/run-*.json | head -1)
        
        if [ -f "$LATEST_RUN" ]; then
            echo "📄 Found deployment data: $LATEST_RUN"
            
            # Update frontend config with Hyperliquid addresses
            node script/update-frontend-config.js hyperliquid "$LATEST_RUN"
            
            echo "🎉 Hyperliquid deployment complete!"
            echo "🌐 Your contracts are now live on Hyperliquid testnet"
            echo "🔍 View on explorer: $HYPERLIQUID_EXPLORER_URL"
        else
            echo "⚠️  Warning: Could not find deployment data to update frontend"
        fi
    else
        echo "⚠️  Warning: Broadcast directory not found"
    fi
else
    echo "❌ Deployment failed!"
    exit 1
fi

echo ""
echo "🎯 Next steps:"
echo "1. Update your frontend to connect to Hyperliquid testnet"
echo "2. Test all functionality on the testnet"
echo "3. Share the demo with others!"

