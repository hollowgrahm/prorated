#!/bin/bash

# Stateful Hyperliquid Testnet Deployment Script
# This script deploys the Prorated Protocol with persistent state and resume capability

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="$SCRIPT_DIR/.deployment-state.json"
PREV_STATE_FILE="$SCRIPT_DIR/.deployment-state.prev.json"
TOTAL_STEPS=9

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Function to print step header
print_step() {
    local step_num=$1
    local title=$2
    echo ""
    print_color $CYAN "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_color $CYAN "📦 STEP ${step_num}/${TOTAL_STEPS}: $title"
    print_color $CYAN "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# State management functions
create_initial_state() {
    local deployer=$(cast wallet address --private-key $HYPERLIQUID_PRIVATE_KEY 2>/dev/null || echo "unknown")
    cat > "$STATE_FILE" << EOF
{
  "network": "hyperliquid",
  "chainId": 998,
  "rpcUrl": "$HYPERLIQUID_RPC_URL",
  "deployer": "$deployer",
  "lastUpdated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "steps": {}
}
EOF
    print_color $GREEN "📝 Created initial state file"
}

backup_state() {
    if [ -f "$STATE_FILE" ]; then
        cp "$STATE_FILE" "$PREV_STATE_FILE"
        print_color $BLUE "💾 Backed up current state"
    fi
}

restore_previous_state() {
    if [ -f "$PREV_STATE_FILE" ]; then
        cp "$PREV_STATE_FILE" "$STATE_FILE"
        print_color $GREEN "🔄 Restored previous state"
    else
        print_color $RED "❌ No previous state found to restore"
        exit 1
    fi
}

load_state() {
    if [ ! -f "$STATE_FILE" ]; then
        create_initial_state
    fi
}

save_step_state() {
    local step_id=$1
    local addresses_json=$2
    local tx_hash=${3:-""}
    
    local temp_file=$(mktemp)
    jq --arg step "$step_id" \
       --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       --arg tx "$tx_hash" \
       --argjson addresses "$addresses_json" \
       '.steps[$step] = {
         "completed": true,
         "timestamp": $timestamp,
         "txHash": $tx,
         "addresses": $addresses
       } | .lastUpdated = $timestamp' "$STATE_FILE" > "$temp_file"
    
    mv "$temp_file" "$STATE_FILE"
    print_color $GREEN "✅ Saved state for step $step_id"
}

get_step_addresses() {
    local step_id=$1
    jq -r ".steps[\"$step_id\"].addresses // {}" "$STATE_FILE"
}

is_step_completed() {
    local step_id=$1
    jq -r ".steps[\"$step_id\"].completed // false" "$STATE_FILE"
}

validate_network() {
    local current_chain_id=$(jq -r '.chainId' "$STATE_FILE")
    if [ "$current_chain_id" != "998" ]; then
        print_color $RED "❌ Network mismatch! State file is for chain $current_chain_id, but we're deploying to chain 998"
        exit 1
    fi
}

show_status() {
    if [ ! -f "$STATE_FILE" ]; then
        print_color $YELLOW "📄 No deployment state found"
        return
    fi
    
    print_color $PURPLE "📊 DEPLOYMENT STATUS"
    print_color $PURPLE "═══════════════════"
    echo ""
    
    local network=$(jq -r '.network' "$STATE_FILE")
    local deployer=$(jq -r '.deployer' "$STATE_FILE")
    local last_updated=$(jq -r '.lastUpdated' "$STATE_FILE")
    
    print_color $BLUE "🌐 Network: $network"
    print_color $BLUE "👤 Deployer: $deployer"
    print_color $BLUE "🕒 Last Updated: $last_updated"
    echo ""
    
    # Show step status
    local steps=("01_infrastructure" "02_deployers" "03_factory" "04_active_pool" "05_failed_pool" "06_success_pool" "07_launched_pool" "08_ecosystem" "09_frontend_config")
    local step_names=("Infrastructure" "Deployers" "Factory" "Active Pool" "Failed Pool" "Success Pool" "Launched Pool" "Ecosystem" "Frontend Config")
    
    for i in "${!steps[@]}"; do
        local step_id="${steps[$i]}"
        local step_name="${step_names[$i]}"
        local completed=$(is_step_completed "$step_id")
        
        if [ "$completed" = "true" ]; then
            local timestamp=$(jq -r ".steps[\"$step_id\"].timestamp" "$STATE_FILE")
            print_color $GREEN "✅ Step $((i+1)): $step_name (completed at $timestamp)"
        else
            print_color $YELLOW "⏳ Step $((i+1)): $step_name (pending)"
        fi
    done
    echo ""
}

# Address extraction functions
extract_address_from_logs() {
    local script_name=$1
    local contract_identifier=$2
    local broadcast_dir="broadcast/${script_name}.s.sol/998"
    
    if [ -d "$broadcast_dir" ]; then
        local latest_run=$(ls -t $broadcast_dir/run-*.json | head -1)
        if [ -f "$latest_run" ]; then
            # Extract address from console logs that contain the identifier
            local address=$(jq -r ".logs[] | select(.log | contains(\"$contract_identifier\")) | .log" "$latest_run" | grep -o '0x[a-fA-F0-9]\{40\}' | head -1)
            echo "$address"
        fi
    fi
}

extract_contract_address_by_index() {
    local script_name=$1
    local index=$2
    local broadcast_dir="broadcast/${script_name}.s.sol/998"
    
    if [ -d "$broadcast_dir" ]; then
        local latest_run=$(ls -t $broadcast_dir/run-*.json | head -1)
        if [ -f "$latest_run" ]; then
            local address=$(jq -r '.transactions[] | select(.transactionType == "CREATE") | .contractAddress' "$latest_run" | sed -n "${index}p")
            echo "$address"
        fi
    fi
}

extract_latest_pool_from_factory() {
    local factory_address=$1
    
    if [ -z "$factory_address" ]; then
        echo ""
        return
    fi
    
    # Get the total number of pools
    local pool_count=$(cast call "$factory_address" "getPoolCount()(uint256)" --rpc-url "$HYPERLIQUID_RPC_URL" 2>/dev/null)
    
    if [ -z "$pool_count" ] || [ "$pool_count" = "0" ]; then
        echo ""
        return
    fi
    
    # Get the latest pool (last in the array)
    local latest_index=$((pool_count - 1))
    local pool_address=$(cast call "$factory_address" "allPools(uint256)(address)" "$latest_index" --rpc-url "$HYPERLIQUID_RPC_URL" 2>/dev/null)
    
    if [ -n "$pool_address" ] && [ "$pool_address" != "0x0000000000000000000000000000000000000000" ]; then
        echo "$pool_address" | tr '[:upper:]' '[:lower:]'
    else
        echo ""
    fi
}

# Step-specific deployment functions
deploy_step_01_infrastructure() {
    print_step 1 "Deploy Infrastructure (MockUSDC, Proswap, Prolend)"
    
    if [ "$(is_step_completed "01_infrastructure")" = "true" ]; then
        print_color $YELLOW "⏭️  Step 1 already completed, skipping..."
        return
    fi
    
    backup_state
    
    print_color $YELLOW "🔨 Deploying infrastructure contracts..."
    
    forge script script/hyperliquid/01_DeployInfrastructure.s.sol:DeployInfrastructure \
        --rpc-url $HYPERLIQUID_RPC_URL \
        --private-key $HYPERLIQUID_PRIVATE_KEY \
        --broadcast \
        --gas-limit 30000000 \
        -v
    
    # Extract addresses from deployment (based on deployment order in script)
    # Order: MockUSDC, ProswapFactory, ProswapRouter, ProlendFactory
    local mock_usdc=$(extract_contract_address_by_index "01_DeployInfrastructure" 1)
    local proswap_factory=$(extract_contract_address_by_index "01_DeployInfrastructure" 2)
    local proswap_router=$(extract_contract_address_by_index "01_DeployInfrastructure" 3)
    local prolend_factory=$(extract_contract_address_by_index "01_DeployInfrastructure" 4)
    
    # Validate addresses
    if [ -z "$mock_usdc" ] || [ -z "$proswap_factory" ] || [ -z "$proswap_router" ] || [ -z "$prolend_factory" ]; then
        print_color $RED "❌ Failed to extract all addresses from step 1"
        print_color $BLUE "Debug - MockUSDC: $mock_usdc"
        print_color $BLUE "Debug - ProswapFactory: $proswap_factory"
        print_color $BLUE "Debug - ProswapRouter: $proswap_router"
        print_color $BLUE "Debug - ProlendFactory: $prolend_factory"
        exit 1
    fi
    
    # Save addresses to state
    local addresses_json=$(jq -n \
        --arg mockUSDC "$mock_usdc" \
        --arg proswapFactory "$proswap_factory" \
        --arg proswapRouter "$proswap_router" \
        --arg prolendFactory "$prolend_factory" \
        '{
            mockUSDC: $mockUSDC,
            proswapFactory: $proswapFactory,
            proswapRouter: $proswapRouter,
            prolendFactory: $prolendFactory
        }')
    
    save_step_state "01_infrastructure" "$addresses_json"
    
    print_color $GREEN "✅ Infrastructure deployment completed"
    print_color $BLUE "📋 MockUSDC: $mock_usdc"
    print_color $BLUE "📋 ProswapFactory: $proswap_factory"
    print_color $BLUE "📋 ProswapRouter: $proswap_router"
    print_color $BLUE "📋 ProlendFactory: $prolend_factory"
}

deploy_step_02_deployers() {
    print_step 2 "Deploy Deployer Contracts"
    
    if [ "$(is_step_completed "02_deployers")" = "true" ]; then
        print_color $YELLOW "⏭️  Step 2 already completed, skipping..."
        return
    fi
    
    # Get prolend factory from previous step
    local prolend_factory=$(echo $(get_step_addresses "01_infrastructure") | jq -r '.prolendFactory')
    
    if [ -z "$prolend_factory" ] || [ "$prolend_factory" = "null" ]; then
        print_color $RED "❌ ProlendFactory address not found from step 1"
        exit 1
    fi
    
    backup_state
    
    print_color $YELLOW "🔨 Deploying deployer contracts..."
    print_color $BLUE "📋 Using ProlendFactory: $prolend_factory"
    
    forge script script/hyperliquid/02_DeployDeployers.s.sol:DeployDeployers \
        --rpc-url $HYPERLIQUID_RPC_URL \
        --private-key $HYPERLIQUID_PRIVATE_KEY \
        --broadcast \
        --gas-limit 30000000 \
        --sig "run(address)" "$prolend_factory" \
        -v
    
    # Extract addresses (deployers are deployed in order)
    local token_deployer=$(extract_contract_address_by_index "02_DeployDeployers" 1)
    local pair_deployer=$(extract_contract_address_by_index "02_DeployDeployers" 2)
    local liquidity_deployer=$(extract_contract_address_by_index "02_DeployDeployers" 3)
    local venft_deployer=$(extract_contract_address_by_index "02_DeployDeployers" 4)
    local governor_deployer=$(extract_contract_address_by_index "02_DeployDeployers" 5)
    local treasury_deployer=$(extract_contract_address_by_index "02_DeployDeployers" 6)
    local prolend_deployer=$(extract_contract_address_by_index "02_DeployDeployers" 7)
    
    # Validate addresses
    if [ -z "$token_deployer" ] || [ -z "$pair_deployer" ] || [ -z "$liquidity_deployer" ] || [ -z "$venft_deployer" ] || [ -z "$governor_deployer" ] || [ -z "$treasury_deployer" ] || [ -z "$prolend_deployer" ]; then
        print_color $RED "❌ Failed to extract all deployer addresses from step 2"
        exit 1
    fi
    
    # Save addresses to state
    local addresses_json=$(jq -n \
        --arg tokenDeployer "$token_deployer" \
        --arg pairDeployer "$pair_deployer" \
        --arg liquidityDeployer "$liquidity_deployer" \
        --arg venftDeployer "$venft_deployer" \
        --arg governorDeployer "$governor_deployer" \
        --arg treasuryDeployer "$treasury_deployer" \
        --arg prolendDeployer "$prolend_deployer" \
        '{
            tokenDeployer: $tokenDeployer,
            pairDeployer: $pairDeployer,
            liquidityDeployer: $liquidityDeployer,
            venftDeployer: $venftDeployer,
            governorDeployer: $governorDeployer,
            treasuryDeployer: $treasuryDeployer,
            prolendDeployer: $prolendDeployer
        }')
    
    save_step_state "02_deployers" "$addresses_json"
    
    print_color $GREEN "✅ Deployer contracts deployment completed"
}

deploy_step_03_factory() {
    print_step 3 "Deploy Prorated Factory"
    
    if [ "$(is_step_completed "03_factory")" = "true" ]; then
        print_color $YELLOW "⏭️  Step 3 already completed, skipping..."
        return
    fi
    
    # Get addresses from previous steps
    local infra_addresses=$(get_step_addresses "01_infrastructure")
    local deployer_addresses=$(get_step_addresses "02_deployers")
    
    local proswap_factory=$(echo "$infra_addresses" | jq -r '.proswapFactory')
    local proswap_router=$(echo "$infra_addresses" | jq -r '.proswapRouter')
    local token_deployer=$(echo "$deployer_addresses" | jq -r '.tokenDeployer')
    local pair_deployer=$(echo "$deployer_addresses" | jq -r '.pairDeployer')
    local liquidity_deployer=$(echo "$deployer_addresses" | jq -r '.liquidityDeployer')
    local venft_deployer=$(echo "$deployer_addresses" | jq -r '.venftDeployer')
    local governor_deployer=$(echo "$deployer_addresses" | jq -r '.governorDeployer')
    local treasury_deployer=$(echo "$deployer_addresses" | jq -r '.treasuryDeployer')
    local prolend_deployer=$(echo "$deployer_addresses" | jq -r '.prolendDeployer')
    
    # Validate all required addresses
    if [ -z "$proswap_factory" ] || [ "$proswap_factory" = "null" ] || \
       [ -z "$proswap_router" ] || [ "$proswap_router" = "null" ] || \
       [ -z "$token_deployer" ] || [ "$token_deployer" = "null" ] || \
       [ -z "$pair_deployer" ] || [ "$pair_deployer" = "null" ] || \
       [ -z "$liquidity_deployer" ] || [ "$liquidity_deployer" = "null" ] || \
       [ -z "$venft_deployer" ] || [ "$venft_deployer" = "null" ] || \
       [ -z "$governor_deployer" ] || [ "$governor_deployer" = "null" ] || \
       [ -z "$treasury_deployer" ] || [ "$treasury_deployer" = "null" ] || \
       [ -z "$prolend_deployer" ] || [ "$prolend_deployer" = "null" ]; then
        print_color $RED "❌ Required addresses not found from previous steps"
        exit 1
    fi
    
    backup_state
    
    print_color $YELLOW "🔨 Deploying Prorated Factory..."
    print_color $BLUE "📋 Using ProswapFactory: $proswap_factory"
    print_color $BLUE "📋 Using ProswapRouter: $proswap_router"
    
    forge script script/hyperliquid/03_DeployFactory.s.sol:DeployFactory \
        --rpc-url $HYPERLIQUID_RPC_URL \
        --private-key $HYPERLIQUID_PRIVATE_KEY \
        --broadcast \
        --gas-limit 30000000 \
        --sig "run(address,address,address,address,address,address,address,address,address)" \
        "$proswap_factory" "$proswap_router" "$token_deployer" "$pair_deployer" \
        "$liquidity_deployer" "$venft_deployer" "$governor_deployer" "$treasury_deployer" "$prolend_deployer" \
        -v
    
    # Extract factory address
    local factory_address=$(extract_contract_address_by_index "03_DeployFactory" 1)
    
    if [ -z "$factory_address" ]; then
        print_color $RED "❌ Failed to extract factory address from step 3"
        exit 1
    fi
    
    # Save address to state
    local addresses_json=$(jq -n --arg factory "$factory_address" '{factory: $factory}')
    save_step_state "03_factory" "$addresses_json"
    
    print_color $GREEN "✅ Factory deployment completed"
    print_color $BLUE "📋 Factory: $factory_address"
}

deploy_step_04_active_pool() {
    print_step 4 "Create Active Demo Pool"
    
    if [ "$(is_step_completed "04_active_pool")" = "true" ]; then
        print_color $YELLOW "⏭️  Step 4 already completed, skipping..."
        return
    fi
    
    # Get addresses from previous steps
    local factory_address=$(echo $(get_step_addresses "03_factory") | jq -r '.factory')
    local mock_usdc=$(echo $(get_step_addresses "01_infrastructure") | jq -r '.mockUSDC')
    
    if [ -z "$factory_address" ] || [ "$factory_address" = "null" ] || [ -z "$mock_usdc" ] || [ "$mock_usdc" = "null" ]; then
        print_color $RED "❌ Required addresses not found from previous steps"
        exit 1
    fi
    
    backup_state
    
    print_color $YELLOW "🔨 Creating active demo pool..."
    print_color $BLUE "📋 Using Factory: $factory_address"
    print_color $BLUE "📋 Using MockUSDC: $mock_usdc"
    
    forge script script/hyperliquid/04_CreateActivePool.s.sol:CreateActivePool \
        --rpc-url $HYPERLIQUID_RPC_URL \
        --private-key $HYPERLIQUID_PRIVATE_KEY \
        --broadcast \
        --gas-limit 30000000 \
        --sig "run(address,address)" "$factory_address" "$mock_usdc" \
        -v
    
    # Extract pool address by querying the factory
    local pool_address=$(extract_latest_pool_from_factory "$factory_address")
    
    if [ -z "$pool_address" ]; then
        print_color $RED "❌ Failed to extract active pool address from step 4"
        exit 1
    fi
    
    # Save address to state
    local addresses_json=$(jq -n --arg pool "$pool_address" '{activePool: $pool}')
    save_step_state "04_active_pool" "$addresses_json"
    
    print_color $GREEN "✅ Active pool creation completed"
    print_color $BLUE "📋 Active Pool: $pool_address"
}

deploy_step_05_failed_pool() {
    print_step 5 "Create Failed Demo Pool"
    
    if [ "$(is_step_completed "05_failed_pool")" = "true" ]; then
        print_color $YELLOW "⏭️  Step 5 already completed, skipping..."
        return
    fi
    
    # Get addresses from previous steps
    local factory_address=$(echo $(get_step_addresses "03_factory") | jq -r '.factory')
    local mock_usdc=$(echo $(get_step_addresses "01_infrastructure") | jq -r '.mockUSDC')
    
    if [ -z "$factory_address" ] || [ "$factory_address" = "null" ] || [ -z "$mock_usdc" ] || [ "$mock_usdc" = "null" ]; then
        print_color $RED "❌ Required addresses not found from previous steps"
        exit 1
    fi
    
    backup_state
    
    print_color $YELLOW "🔨 Creating failed demo pool..."
    
    forge script script/hyperliquid/05_CreateFailedPool.s.sol:CreateFailedPool \
        --rpc-url $HYPERLIQUID_RPC_URL \
        --private-key $HYPERLIQUID_PRIVATE_KEY \
        --broadcast \
        --gas-limit 30000000 \
        --sig "run(address,address)" "$factory_address" "$mock_usdc" \
        -v
    
    # Extract pool address by querying the factory
    local pool_address=$(extract_latest_pool_from_factory "$factory_address")
    
    if [ -z "$pool_address" ]; then
        print_color $RED "❌ Failed to extract failed pool address from step 5"
        exit 1
    fi
    
    # Save address to state
    local addresses_json=$(jq -n --arg pool "$pool_address" '{failedPool: $pool}')
    save_step_state "05_failed_pool" "$addresses_json"
    
    print_color $GREEN "✅ Failed pool creation completed"
    print_color $BLUE "📋 Failed Pool: $pool_address"
}

deploy_step_06_success_pool() {
    print_step 6 "Create Successful Demo Pool"
    
    if [ "$(is_step_completed "06_success_pool")" = "true" ]; then
        print_color $YELLOW "⏭️  Step 6 already completed, skipping..."
        return
    fi
    
    # Get addresses from previous steps
    local factory_address=$(echo $(get_step_addresses "03_factory") | jq -r '.factory')
    local mock_usdc=$(echo $(get_step_addresses "01_infrastructure") | jq -r '.mockUSDC')
    
    if [ -z "$factory_address" ] || [ "$factory_address" = "null" ] || [ -z "$mock_usdc" ] || [ "$mock_usdc" = "null" ]; then
        print_color $RED "❌ Required addresses not found from previous steps"
        exit 1
    fi
    
    backup_state
    
    print_color $YELLOW "🔨 Creating successful demo pool..."
    
    forge script script/hyperliquid/06_CreateSuccessPool.s.sol:CreateSuccessPool \
        --rpc-url $HYPERLIQUID_RPC_URL \
        --private-key $HYPERLIQUID_PRIVATE_KEY \
        --broadcast \
        --gas-limit 30000000 \
        --sig "run(address,address)" "$factory_address" "$mock_usdc" \
        -v
    
    # Extract pool address by querying the factory
    local pool_address=$(extract_latest_pool_from_factory "$factory_address")
    
    if [ -z "$pool_address" ]; then
        print_color $RED "❌ Failed to extract success pool address from step 6"
        exit 1
    fi
    
    # Save address to state
    local addresses_json=$(jq -n --arg pool "$pool_address" '{successPool: $pool}')
    save_step_state "06_success_pool" "$addresses_json"
    
    print_color $GREEN "✅ Successful pool creation completed"
    print_color $BLUE "📋 Success Pool: $pool_address"
}

deploy_step_07_launched_pool() {
    print_step 7 "Create Launched Pool (Prorated Protocol)"
    
    if [ "$(is_step_completed "07_launched_pool")" = "true" ]; then
        print_color $YELLOW "⏭️  Step 7 already completed, skipping..."
        return
    fi
    
    # Get addresses from previous steps
    local factory_address=$(echo $(get_step_addresses "03_factory") | jq -r '.factory')
    local mock_usdc=$(echo $(get_step_addresses "01_infrastructure") | jq -r '.mockUSDC')
    
    if [ -z "$factory_address" ] || [ "$factory_address" = "null" ] || [ -z "$mock_usdc" ] || [ "$mock_usdc" = "null" ]; then
        print_color $RED "❌ Required addresses not found from previous steps"
        exit 1
    fi
    
    backup_state
    
    print_color $YELLOW "🔨 Creating launched pool (Prorated Protocol)..."
    
    forge script script/hyperliquid/07_CreateLaunchedPool.s.sol:CreateLaunchedPool \
        --rpc-url $HYPERLIQUID_RPC_URL \
        --private-key $HYPERLIQUID_PRIVATE_KEY \
        --broadcast \
        --gas-limit 30000000 \
        --sig "run(address,address)" "$factory_address" "$mock_usdc" \
        -v
    
    # Extract pool address by querying the factory
    local pool_address=$(extract_latest_pool_from_factory "$factory_address")
    
    if [ -z "$pool_address" ]; then
        print_color $RED "❌ Failed to extract launched pool address from step 7"
        exit 1
    fi
    
    # Save address to state
    local addresses_json=$(jq -n --arg pool "$pool_address" '{launchedPool: $pool}')
    save_step_state "07_launched_pool" "$addresses_json"
    
    print_color $GREEN "✅ Launched pool creation completed"
    print_color $BLUE "📋 Launched Pool: $pool_address"
}

deploy_step_08_ecosystem() {
    print_step 8 "Deploy Launched Pool Ecosystem"
    
    if [ "$(is_step_completed "08_ecosystem")" = "true" ]; then
        print_color $YELLOW "⏭️  Step 8 already completed, skipping..."
        return
    fi
    
    # Get launched pool address from previous step
    local launched_pool=$(echo $(get_step_addresses "07_launched_pool") | jq -r '.launchedPool')
    
    if [ -z "$launched_pool" ] || [ "$launched_pool" = "null" ]; then
        print_color $RED "❌ Launched pool address not found from step 7"
        exit 1
    fi
    
    backup_state
    
    print_color $YELLOW "🔨 Deploying launched pool ecosystem..."
    print_color $BLUE "📋 Using Launched Pool: $launched_pool"
    
    forge script script/hyperliquid/08_DeployLaunchedEcosystem.s.sol:DeployLaunchedEcosystem \
        --rpc-url $HYPERLIQUID_RPC_URL \
        --private-key $HYPERLIQUID_PRIVATE_KEY \
        --broadcast \
        --gas-limit 30000000 \
        --sig "run(address)" "$launched_pool" \
        -v
    
    # Save completion to state (ecosystem deployment doesn't create new contracts we need to track)
    local addresses_json=$(jq -n '{}')
    save_step_state "08_ecosystem" "$addresses_json"
    
    print_color $GREEN "✅ Ecosystem deployment completed"
}

deploy_step_09_frontend_config() {
    print_step 9 "Update Frontend Configuration"
    
    if [ "$(is_step_completed "09_frontend_config")" = "true" ]; then
        print_color $YELLOW "⏭️  Step 9 already completed, skipping..."
        return
    fi
    
    backup_state
    
    print_color $YELLOW "🔧 Updating frontend configuration..."
    
    # Update frontend config with deployed addresses
    node script/update-frontend-config.js hyperliquid
    
    if [ $? -eq 0 ]; then
        print_color $GREEN "✅ Frontend configuration updated successfully"
        
        # Save completion to state
        local addresses_json=$(jq -n '{}')
        save_step_state "09_frontend_config" "$addresses_json"
    else
        print_color $RED "❌ Failed to update frontend configuration"
        exit 1
    fi
}

# Main execution functions
full_deployment() {
    print_color $PURPLE "🚀 PRORATED PROTOCOL - HYPERLIQUID TESTNET DEPLOYMENT"
    print_color $PURPLE "════════════════════════════════════════════════════"
    echo ""
    
    local start_time=$(date +%s)
    
    # Initialize or load state
    load_state
    validate_network
    
    print_color $BLUE "🌐 Network: Hyperliquid Testnet (Chain ID: 998)"
    print_color $BLUE "🔗 RPC: $HYPERLIQUID_RPC_URL"
    print_color $BLUE "🔍 Explorer: $HYPERLIQUID_EXPLORER_URL"
    print_color $BLUE "👤 Deployer: $(jq -r '.deployer' "$STATE_FILE")"
    echo ""
    
    # Execute all steps
    deploy_step_01_infrastructure
    deploy_step_02_deployers
    deploy_step_03_factory
    deploy_step_04_active_pool
    deploy_step_05_failed_pool
    deploy_step_06_success_pool
    deploy_step_07_launched_pool
    deploy_step_08_ecosystem
    deploy_step_09_frontend_config
    
    # Deployment summary
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    local minutes=$((total_duration / 60))
    local seconds=$((total_duration % 60))
    
    echo ""
    print_color $GREEN "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
    print_color $GREEN "════════════════════════════════════════"
    echo ""
    print_color $CYAN "⏱️  Total Time: ${minutes}m ${seconds}s"
    print_color $CYAN "📊 Steps Completed: ${TOTAL_STEPS}/${TOTAL_STEPS}"
    echo ""
    print_color $GREEN "🌐 Your Prorated Protocol is now live on Hyperliquid Testnet!"
    print_color $GREEN "🔍 View contracts on explorer: $HYPERLIQUID_EXPLORER_URL"
    echo ""
}

resume_from_step() {
    local start_step=$1
    
    if [ -z "$start_step" ] || [ "$start_step" -lt 1 ] || [ "$start_step" -gt $TOTAL_STEPS ]; then
        print_color $RED "❌ Invalid step number. Must be between 1 and $TOTAL_STEPS"
        exit 1
    fi
    
    print_color $PURPLE "🔄 RESUMING DEPLOYMENT FROM STEP $start_step"
    print_color $PURPLE "═══════════════════════════════════════════"
    echo ""
    
    load_state
    validate_network
    
    # Execute steps starting from the specified step
    for ((step=$start_step; step<=TOTAL_STEPS; step++)); do
        case $step in
            1) deploy_step_01_infrastructure ;;
            2) deploy_step_02_deployers ;;
            3) deploy_step_03_factory ;;
            4) deploy_step_04_active_pool ;;
            5) deploy_step_05_failed_pool ;;
            6) deploy_step_06_success_pool ;;
            7) deploy_step_07_launched_pool ;;
            8) deploy_step_08_ecosystem ;;
            9) deploy_step_09_frontend_config ;;
        esac
    done
    
    print_color $GREEN "🎉 Resumed deployment completed successfully!"
}

reset_and_start() {
    print_color $YELLOW "🔄 Resetting deployment state..."
    
    if [ -f "$STATE_FILE" ]; then
        rm "$STATE_FILE"
        print_color $GREEN "✅ State file removed"
    fi
    
    if [ -f "$PREV_STATE_FILE" ]; then
        rm "$PREV_STATE_FILE"
        print_color $GREEN "✅ Previous state file removed"
    fi
    
    full_deployment
}

# Main entry point
main() {
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
    
    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        print_color $RED "❌ Error: jq is required but not installed"
        print_color $YELLOW "📝 Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
        exit 1
    fi
    
    # Parse command line arguments
    case $1 in
        --resume-from)
            if [ -z "$2" ]; then
                print_color $RED "❌ Error: --resume-from requires a step number"
                exit 1
            fi
            resume_from_step $2
            ;;
        --status)
            show_status
            ;;
        --reset)
            reset_and_start
            ;;
        --restore-prev)
            restore_previous_state
            print_color $GREEN "✅ Previous state restored. You can now resume deployment."
            ;;
        --help|-h)
            print_color $CYAN "🚀 Prorated Protocol Deployment Script"
            echo ""
            print_color $YELLOW "Usage:"
            print_color $BLUE "  $0                    # Full deployment from beginning"
            print_color $BLUE "  $0 --resume-from N    # Resume from step N (1-9)"
            print_color $BLUE "  $0 --status           # Show deployment status"
            print_color $BLUE "  $0 --reset            # Reset state and start fresh"
            print_color $BLUE "  $0 --restore-prev     # Restore previous state"
            print_color $BLUE "  $0 --help             # Show this help"
            echo ""
            ;;
        "")
            full_deployment
            ;;
        *)
            print_color $RED "❌ Unknown option: $1"
            print_color $YELLOW "Use --help for usage information"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
