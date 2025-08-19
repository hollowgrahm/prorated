#!/bin/bash

# Prorated Protocol Local Development Setup
# This script sets up a local Anvil testnet with deployed contracts

set -e

echo "🚀 Setting up Prorated Protocol local development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if anvil is installed
if ! command -v anvil &> /dev/null; then
    echo -e "${RED}❌ Anvil not found. Please install Foundry first:${NC}"
    echo "curl -L https://foundry.paradigm.xyz | bash"
    echo "foundryup"
    exit 1
fi

# Check if forge is installed
if ! command -v forge &> /dev/null; then
    echo -e "${RED}❌ Forge not found. Please install Foundry first.${NC}"
    exit 1
fi

# Default values
ANVIL_PORT=${ANVIL_PORT:-8545}
# Anvil's default first account (has 10,000 ETH by default)
ANVIL_ACCOUNT="0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Anvil Port: $ANVIL_PORT"
echo "  Using Anvil's default account: $ANVIL_ACCOUNT"
echo ""

# Kill any existing anvil processes
echo -e "${YELLOW}🔧 Cleaning up existing processes...${NC}"
pkill -f anvil || true
sleep 2

# Start Anvil in the background
echo -e "${YELLOW}🔨 Starting Anvil local testnet...${NC}"
anvil --port $ANVIL_PORT --accounts 10 --balance 10000 &
ANVIL_PID=$!
echo "Anvil PID: $ANVIL_PID"

# Wait for Anvil to start
echo -e "${YELLOW}⏳ Waiting for Anvil to start...${NC}"
sleep 5

# Test connection
if curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://localhost:$ANVIL_PORT > /dev/null; then
    echo -e "${GREEN}✅ Anvil is running on port $ANVIL_PORT${NC}"
else
    echo -e "${RED}❌ Failed to connect to Anvil${NC}"
    kill $ANVIL_PID 2>/dev/null || true
    exit 1
fi

# Build contracts
echo -e "${YELLOW}🏗️  Building contracts...${NC}"
forge build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to build contracts${NC}"
    kill $ANVIL_PID 2>/dev/null || true
    exit 1
fi

# Deploy contracts
echo -e "${YELLOW}🚀 Deploying contracts...${NC}"
forge script script/Deploy.s.sol:Deploy \
  --rpc-url http://localhost:$ANVIL_PORT \
  --broadcast \
  --unlocked \
  --sender $ANVIL_ACCOUNT

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to deploy contracts${NC}"
    kill $ANVIL_PID 2>/dev/null || true
    exit 1
fi

# Extract contract addresses from broadcast logs
BROADCAST_DIR="./broadcast/Deploy.s.sol/31337"
if [ -d "$BROADCAST_DIR" ]; then
    echo -e "${YELLOW}📝 Extracting contract addresses...${NC}"
    
    # Find the latest run file
    LATEST_RUN=$(ls -t "$BROADCAST_DIR"/run-*.json | head -n1)
    
    if [ -f "$LATEST_RUN" ]; then
        echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
        echo ""
        echo -e "${YELLOW}📋 Contract Addresses:${NC}"
        
        # Extract addresses using jq if available, otherwise use basic parsing
        if command -v jq &> /dev/null; then
            echo "Using the broadcast logs to get addresses..."
            echo "Check the Deploy.s.sol output above for contract addresses."
        else
            echo "Install jq for automatic address extraction: brew install jq"
            echo "Check the Deploy.s.sol output above for contract addresses."
        fi
        
        echo ""
        echo -e "${GREEN}✅ Local development environment is ready!${NC}"
        echo ""
        echo -e "${YELLOW}📝 Next steps:${NC}"
        echo "1. Copy the contract addresses from the deployment output above"
        echo "2. Create frontend/.env.local with the contract addresses"
        echo "3. Start the frontend: cd frontend && npm run dev"
        echo ""
        echo -e "${YELLOW}🔗 Local network details:${NC}"
        echo "  RPC URL: http://localhost:$ANVIL_PORT"
        echo "  Chain ID: 31337"
        echo "  Default Account: $ANVIL_ACCOUNT"
        echo "  Account has 10,000 ETH for testing"
        echo ""
        echo -e "${RED}⚠️  Keep this terminal open to maintain the local blockchain!${NC}"
        echo "  To stop: Ctrl+C or run: kill $ANVIL_PID"
        
        # Save PID for cleanup
        echo $ANVIL_PID > .anvil.pid
        
        # Wait for interrupt
        trap "echo -e '\n${YELLOW}🛑 Shutting down Anvil...${NC}'; kill $ANVIL_PID 2>/dev/null || true; rm -f .anvil.pid; exit 0" INT
        
        echo -e "${GREEN}🚀 Anvil is running! Press Ctrl+C to stop.${NC}"
        wait $ANVIL_PID
        
    else
        echo -e "${RED}❌ Could not find deployment broadcast file${NC}"
        kill $ANVIL_PID 2>/dev/null || true
        exit 1
    fi
else
    echo -e "${RED}❌ Deployment broadcast directory not found${NC}"
    kill $ANVIL_PID 2>/dev/null || true
    exit 1
fi
