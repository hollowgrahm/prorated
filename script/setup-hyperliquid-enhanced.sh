#!/bin/bash

# Enhanced Hyperliquid Testnet Deployment Script
# This script deploys the Prorated Protocol to Hyperliquid testnet with detailed progress tracking

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Progress tracking
TOTAL_STEPS=9
CURRENT_STEP=0

# Timing variables
STEP_START_TIME=0
DEPLOYMENT_START_TIME=$(date +%s)

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Function to print step header
print_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    STEP_START_TIME=$(date +%s)
    echo ""
    print_color $CYAN "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color $CYAN "📦 STEP ${CURRENT_STEP}/${TOTAL_STEPS}: $1"
    print_color $CYAN "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Function to print step completion
print_step_complete() {
    local step_end_time=$(date +%s)
    local step_duration=$((step_end_time - STEP_START_TIME))
    local total_duration=$((step_end_time - DEPLOYMENT_START_TIME))
    
    echo ""
    print_color $GREEN "✅ Step ${CURRENT_STEP} completed in ${step_duration}s (Total: ${total_duration}s)"
    echo ""
}

# Function to execute forge script with progress tracking
execute_forge_script() {
    local script_path=$1
    local script_name=$2
    local description=$3
    local signature=$4
    shift 4  # Remove first 4 arguments, remaining are script parameters
    
    print_color $YELLOW "🔨 Executing: $description"
    print_color $BLUE "📄 Script: $script_path"
    print_color $PURPLE "⏰ Started at: $(date '+%H:%M:%S')"
    
    if [ -n "$signature" ] && [ $# -gt 0 ]; then
        print_color $CYAN "📋 Parameters: $*"
    fi
    
    echo ""
    print_color $CYAN "🚀 Broadcasting transaction..."
    
    # Execute the forge script with or without parameters
    if [ -n "$signature" ] && [ $# -gt 0 ]; then
        forge script "$script_path:$script_name" \
            --rpc-url $HYPERLIQUID_RPC_URL \
            --private-key $HYPERLIQUID_PRIVATE_KEY \
            --broadcast \
            --gas-limit 30000000 \
            --sig "$signature" "$@" \
            -vv
    else
        forge script "$script_path:$script_name" \
            --rpc-url $HYPERLIQUID_RPC_URL \
            --private-key $HYPERLIQUID_PRIVATE_KEY \
            --broadcast \
            --gas-limit 30000000 \
            -vv
    fi
    
    if [ $? -eq 0 ]; then
        print_color $GREEN "✅ Transaction broadcast successful"
        print_color $CYAN "⏳ Waiting for confirmation..."
        sleep 3  # Give time for transaction to be mined
        print_color $GREEN "✅ Transaction confirmed"
    else
        print_color $RED "❌ Transaction failed"
        exit 1
    fi
}

# Function to update environment file
update_env_file() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" .env.hyperliquid; then
        # Update existing key
        sed -i.bak "s|^${key}=.*|${key}=${value}|" .env.hyperliquid
    else
        # Add new key
        echo "${key}=${value}" >> .env.hyperliquid
    fi
    
    print_color $GREEN "📝 Updated .env.hyperliquid: ${key}=${value}"
}

# Function to extract address from broadcast file
extract_address() {
    local script_name=$1
    local index=${2:-1}  # Default to first address if not specified
    local broadcast_dir="broadcast/${script_name}.s.sol/998"
    
    if [ -d "$broadcast_dir" ]; then
        local latest_run=$(ls -t $broadcast_dir/run-*.json | head -1)
        if [ -f "$latest_run" ]; then
            # Extract the deployed contract address by index (1-based)
            local address=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | .contractAddress' "$latest_run" | sed -n "${index}p")
            echo "$address"
        fi
    fi
}

# Function to extract specific contract address by looking at console logs
extract_address_by_name() {
    local script_name=$1
    local contract_name=$2
    local broadcast_dir="broadcast/${script_name}.s.sol/998"
    
    if [ -d "$broadcast_dir" ]; then
        local latest_run=$(ls -t $broadcast_dir/run-*.json | head -1)
        if [ -f "$latest_run" ]; then
            # Look for the specific contract in console logs
            local address=$(jq -r --arg name "$contract_name" '.logs[] | select(.log | contains($name)) | .log' "$latest_run" | grep -o '0x[a-fA-F0-9]\{40\}' | head -1)
            echo "$address"
        fi
    fi
}

# Main deployment function
main() {
    print_color $PURPLE "🚀 PRORATED PROTOCOL - HYPERLIQUID TESTNET DEPLOYMENT"
    print_color $PURPLE "════════════════════════════════════════════════════"
    echo ""
    print_color $BLUE "🌐 Network: Hyperliquid Testnet (Chain ID: 998)"
    print_color $BLUE "🔗 RPC: $HYPERLIQUID_RPC_URL"
    print_color $BLUE "🔍 Explorer: $HYPERLIQUID_EXPLORER_URL"
    print_color $BLUE "👤 Deployer: $(cast wallet address --private-key $HYPERLIQUID_PRIVATE_KEY)"
    echo ""

    # Step 1: Deploy Infrastructure
    print_step "Deploy Infrastructure (MockUSDC, Proswap, Prolend)"
    execute_forge_script "script/hyperliquid/01_DeployInfrastructure.s.sol" "DeployInfrastructure" "Core infrastructure contracts" ""
    
    # Extract and save addresses (based on deployment order in the script)
    # MockUSDC is deployed 2nd, ProlendFactory is deployed 4th (last)
    MOCK_USDC_ADDRESS=$(extract_address "01_DeployInfrastructure" 2)
    PROLEND_FACTORY_ADDRESS=$(extract_address "01_DeployInfrastructure" 4)
    update_env_file "MOCK_USDC_ADDRESS" "$MOCK_USDC_ADDRESS"
    
    print_color $BLUE "📋 Extracted Addresses:"
    print_color $BLUE "├── MockUSDC: $MOCK_USDC_ADDRESS"
    print_color $BLUE "└── ProlendFactory: $PROLEND_FACTORY_ADDRESS"
    
    print_step_complete

    # Step 2: Deploy Deployers
    print_step "Deploy Deployer Contracts"
    execute_forge_script "script/hyperliquid/02_DeployDeployers.s.sol" "DeployDeployers" "Token, Pair, Liquidity, VeNFT, Governor, Treasury, Prolend deployers" "run(address)" "$PROLEND_FACTORY_ADDRESS"
    print_step_complete

    # Step 3: Deploy Factory
    print_step "Deploy Prorated Factory"
    execute_forge_script "script/hyperliquid/03_DeployFactory.s.sol" "DeployFactory" "Main factory contract for pool creation" ""
    
    # Extract and save factory address
    FACTORY_ADDRESS=$(extract_address "03_DeployFactory")
    update_env_file "PRORATED_FACTORY_ADDRESS" "$FACTORY_ADDRESS"
    
    print_step_complete

    # Step 4: Create Active Pool
    print_step "Create Active Demo Pool"
    execute_forge_script "script/hyperliquid/04_CreateActivePool.s.sol" "CreateActivePool" "Active pool (10% funded, 7 days remaining)" "run(address,address)" "$FACTORY_ADDRESS" "$MOCK_USDC_ADDRESS"
    
    ACTIVE_POOL_ADDRESS=$(extract_address "04_CreateActivePool")
    update_env_file "ACTIVE_POOL_ADDRESS" "$ACTIVE_POOL_ADDRESS"
    
    print_step_complete

    # Step 5: Create Failed Pool
    print_step "Create Failed Demo Pool"
    execute_forge_script "script/hyperliquid/05_CreateFailedPool.s.sol" "CreateFailedPool" "Failed pool (30% funded, expired)" "run(address,address)" "$FACTORY_ADDRESS" "$MOCK_USDC_ADDRESS"
    
    FAILED_POOL_ADDRESS=$(extract_address "05_CreateFailedPool")
    update_env_file "FAILED_POOL_ADDRESS" "$FAILED_POOL_ADDRESS"
    
    print_step_complete

    # Step 6: Create Success Pool
    print_step "Create Successful Demo Pool"
    execute_forge_script "script/hyperliquid/06_CreateSuccessPool.s.sol" "CreateSuccessPool" "Successful pool (100% funded, ready for deployment)" "run(address,address)" "$FACTORY_ADDRESS" "$MOCK_USDC_ADDRESS"
    
    SUCCESS_POOL_ADDRESS=$(extract_address "06_CreateSuccessPool")
    update_env_file "SUCCESS_POOL_ADDRESS" "$SUCCESS_POOL_ADDRESS"
    
    print_step_complete

    # Step 7: Create Launched Pool
    print_step "Create Launched Pool (Prorated Protocol)"
    execute_forge_script "script/hyperliquid/07_CreateLaunchedPool.s.sol" "CreateLaunchedPool" "Prorated Protocol pool (100% funded, ready for ecosystem)" "run(address,address)" "$FACTORY_ADDRESS" "$MOCK_USDC_ADDRESS"
    
    LAUNCHED_POOL_ADDRESS=$(extract_address "07_CreateLaunchedPool")
    update_env_file "LAUNCHED_POOL_ADDRESS" "$LAUNCHED_POOL_ADDRESS"
    
    print_step_complete

    # Step 8: Deploy Launched Ecosystem
    print_step "Deploy Launched Pool Ecosystem"
    execute_forge_script "script/hyperliquid/08_DeployLaunchedEcosystem.s.sol" "DeployLaunchedEcosystem" "Full ecosystem (Token, DEX, Governance, Treasury, Lending)" "run(address)" "$LAUNCHED_POOL_ADDRESS"
    print_step_complete

    # Step 9: Update Frontend Configuration
    print_step "Update Frontend Configuration"
    print_color $YELLOW "🔧 Updating frontend configuration with deployed addresses..."
    
    node script/update-frontend-config.js hyperliquid
    
    if [ $? -eq 0 ]; then
        print_color $GREEN "✅ Frontend configuration updated successfully"
    else
        print_color $RED "❌ Failed to update frontend configuration"
        exit 1
    fi
    
    print_step_complete

    # Deployment Summary
    local total_end_time=$(date +%s)
    local total_duration=$((total_end_time - DEPLOYMENT_START_TIME))
    local minutes=$((total_duration / 60))
    local seconds=$((total_duration % 60))
    
    echo ""
    print_color $GREEN "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    print_color $GREEN "════════════════════════════════════════"
    echo ""
    print_color $CYAN "⏱️  Total Time: ${minutes}m ${seconds}s"
    print_color $CYAN "📊 Steps Completed: ${CURRENT_STEP}/${TOTAL_STEPS}"
    echo ""
    print_color $YELLOW "📋 DEPLOYED CONTRACTS:"
    print_color $BLUE "├── MockUSDC: $MOCK_USDC_ADDRESS"
    print_color $BLUE "├── Factory: $FACTORY_ADDRESS"
    print_color $BLUE "├── Active Pool: $ACTIVE_POOL_ADDRESS"
    print_color $BLUE "├── Failed Pool: $FAILED_POOL_ADDRESS"
    print_color $BLUE "├── Success Pool: $SUCCESS_POOL_ADDRESS"
    print_color $BLUE "└── Launched Pool: $LAUNCHED_POOL_ADDRESS"
    echo ""
    print_color $GREEN "🌐 Your Prorated Protocol is now live on Hyperliquid Testnet!"
    print_color $GREEN "🔍 View contracts on explorer: $HYPERLIQUID_EXPLORER_URL"
    echo ""
    print_color $CYAN "🎯 Next Steps:"
    print_color $BLUE "1. Start your frontend: npm run dev"
    print_color $BLUE "2. Connect to Hyperliquid Testnet in your wallet"
    print_color $BLUE "3. Test all functionality on the live testnet"
    print_color $BLUE "4. Share your demo with the world! 🚀"
    echo ""
}

# Check if .env.hyperliquid exists
if [ ! -f ".env.hyperliquid" ]; then
    print_color $RED "❌ Error: .env.hyperliquid file not found!"
    print_color $YELLOW "📝 Please copy .env.hyperliquid.example to .env.hyperliquid and fill in your private key"
    exit 1
fi

# Load environment variables
source .env.hyperliquid

# Validate required variables
if [ -z "$HYPERLIQUID_PRIVATE_KEY" ]; then
    print_color $RED "❌ Error: HYPERLIQUID_PRIVATE_KEY not set in .env.hyperliquid"
    exit 1
fi

# Check if jq is installed (needed for JSON parsing)
if ! command -v jq &> /dev/null; then
    print_color $RED "❌ Error: jq is required but not installed"
    print_color $YELLOW "📝 Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    exit 1
fi

# Run main deployment
main
