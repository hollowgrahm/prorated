# Hyperliquid Testnet Deployment Scripts

This directory contains the modular deployment scripts for deploying the Prorated Protocol to Hyperliquid testnet.

## 📋 Deployment Order

The deployment process follows this exact order:

1. **01_DeployInfrastructure.s.sol** - Deploy MockUSDC, Proswap Factory/Router, Prolend Factory
2. **02_DeployDeployers.s.sol** - Deploy all deployer contracts (Token, Pair, Liquidity, VeNFT, Governor, Treasury, Prolend)
3. **03_DeployFactory.s.sol** - Deploy the main Prorated Factory contract
4. **04_CreateActivePool.s.sol** - Create active demo pool (10% funded, 7 days remaining)
5. **05_CreateFailedPool.s.sol** - Create failed demo pool (30% funded, expired)
6. **06_CreateSuccessPool.s.sol** - Create successful demo pool (100% funded, ready for deployment)
7. **07_CreateLaunchedPool.s.sol** - Create launched pool (Prorated Protocol, 100% funded)
8. **08_DeployLaunchedEcosystem.s.sol** - Deploy full ecosystem for launched pool
9. **update-frontend-config.js** - Update frontend configuration with deployed addresses

## 🚀 Quick Start

### Automated Deployment (Recommended)

```bash
# Run the enhanced deployment script with visual progress tracking
./script/setup-hyperliquid-enhanced.sh
```

### Manual Deployment

If you need to run individual steps:

```bash
# Set up environment
source .env.hyperliquid

# Step 1: Infrastructure
forge script script/hyperliquid/01_DeployInfrastructure.s.sol:DeployInfrastructure \
    --rpc-url $HYPERLIQUID_RPC_URL \
    --private-key $HYPERLIQUID_PRIVATE_KEY \
    --broadcast --gas-limit 30000000 -vv

# Step 2: Deployers
forge script script/hyperliquid/02_DeployDeployers.s.sol:DeployDeployers \
    --rpc-url $HYPERLIQUID_RPC_URL \
    --private-key $HYPERLIQUID_PRIVATE_KEY \
    --broadcast --gas-limit 30000000 -vv

# ... continue with remaining steps
```

## 📁 Script Descriptions

### Infrastructure Scripts

- **01_DeployInfrastructure** - Core protocol infrastructure
- **02_DeployDeployers** - Factory pattern deployer contracts
- **03_DeployFactory** - Main factory for pool creation

### Pool Creation Scripts

- **04_CreateActivePool** - Demo pool currently accepting contributions
- **05_CreateFailedPool** - Demo pool that failed to reach funding goal
- **06_CreateSuccessPool** - Demo pool that succeeded but hasn't deployed yet
- **07_CreateLaunchedPool** - Prorated Protocol pool ready for ecosystem deployment

### Ecosystem Scripts

- **08_DeployLaunchedEcosystem** - Deploy token, DEX, governance, treasury, lending

## 🔧 Environment Variables

Required in `.env.hyperliquid`:

```bash
HYPERLIQUID_PRIVATE_KEY=your_private_key_here
HYPERLIQUID_RPC_URL=https://rpc.hyperliquid-testnet.xyz/evm
HYPERLIQUID_EXPLORER_URL=https://testnet.purrsec.com/

# Auto-populated during deployment
MOCK_USDC_ADDRESS=0x...
PRORATED_FACTORY_ADDRESS=0x...
ACTIVE_POOL_ADDRESS=0x...
FAILED_POOL_ADDRESS=0x...
SUCCESS_POOL_ADDRESS=0x...
LAUNCHED_POOL_ADDRESS=0x...
```

## 🎯 Features

- **Visual Progress Tracking** - Real-time progress bars and timing
- **Automatic Address Extraction** - Parses broadcast files for contract addresses
- **Environment Management** - Auto-updates `.env.hyperliquid` with deployed addresses
- **Error Handling** - Stops on first error with clear error messages
- **Modular Design** - Each step can be run independently
- **Time Tracking** - Shows duration for each step and total deployment time

## 🐛 Troubleshooting

### Common Issues

1. **Gas Limit Too Low**

   ```bash
   # Increase gas limit for complex deployments
   --gas-limit 50000000
   ```

2. **RPC Timeout**

   ```bash
   # Add retry logic or switch RPC endpoints
   # The script includes automatic RPC fallback
   ```

3. **Missing Dependencies**
   ```bash
   # Install required tools
   brew install jq  # For JSON parsing
   ```

### Manual Recovery

If a step fails, you can resume from any point by:

1. Check which contracts are already deployed in `.env.hyperliquid`
2. Run individual scripts starting from the failed step
3. Update environment variables manually if needed

## 📊 Expected Results

After successful deployment:

- ✅ 4 demo pools with different states (active, failed, success, launched)
- ✅ Full ecosystem for Prorated Protocol (PRO token)
- ✅ Trading pairs on Proswap DEX
- ✅ Governance system with veNFTs
- ✅ Treasury and lending protocols
- ✅ Frontend configured for Hyperliquid testnet

Total deployment time: ~5-10 minutes depending on network conditions.
