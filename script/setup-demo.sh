#!/bin/bash

# Setup Demo Environment on Anvil
echo "🚀 Setting up Prorated Protocol Demo on Anvil..."

# Check if anvil is running
if ! pgrep -f "anvil" > /dev/null; then
    echo "❌ Anvil is not running. Please start Anvil first:"
    echo "   anvil --host 0.0.0.0 --port 8545"
    exit 1
fi

echo "✅ Anvil detected, deploying demo contracts..."

# Deploy demo contracts
forge script script/DeployDemo.s.sol:DeployDemo \
    --rpc-url http://localhost:8545 \
    --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
    --broadcast \
    --legacy

echo "🎉 Demo deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Copy the environment variables from the output above"
echo "2. Add them to your frontend/.env.local file"
echo "3. Start your frontend: cd frontend && npm run dev"
echo "4. Visit http://localhost:3000 to test the demo"
echo ""
echo "💡 Demo features:"
echo "- USDC Faucet: Get 1000 USDC per click"
echo "- Auto-approval: No approval transactions needed"
echo "- Time controls: Skip time to test different pool states"
echo "- Pre-funded pools: Test all scenarios immediately"
