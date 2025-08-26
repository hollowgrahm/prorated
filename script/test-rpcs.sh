#!/bin/bash

# Test Hyperliquid RPC endpoints
echo "🔍 Testing Hyperliquid Testnet RPC endpoints..."

RPC1="https://rpc.hyperliquid-testnet.xyz/evm"
RPC2="https://spectrum-01.simplystaking.xyz/hyperliquid-tn-rpc/evm"

test_rpc() {
    local rpc_url=$1
    local name=$2
    
    echo "Testing $name: $rpc_url"
    
    # Test with a simple eth_chainId call
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        "$rpc_url" \
        --max-time 5)
    
    if [[ $? -eq 0 ]] && [[ $response == *"0x3e6"* ]]; then
        echo "✅ $name is working (Chain ID: 998)"
        return 0
    else
        echo "❌ $name failed or timed out"
        echo "Response: $response"
        return 1
    fi
}

echo ""
echo "=== RPC Health Check ==="

# Test primary RPC
if test_rpc "$RPC1" "Primary RPC"; then
    PRIMARY_OK=true
else
    PRIMARY_OK=false
fi

echo ""

# Test backup RPC
if test_rpc "$RPC2" "Backup RPC"; then
    BACKUP_OK=true
else
    BACKUP_OK=false
fi

echo ""
echo "=== Summary ==="

if [[ $PRIMARY_OK == true ]] && [[ $BACKUP_OK == true ]]; then
    echo "🎉 Both RPCs are healthy!"
elif [[ $PRIMARY_OK == true ]]; then
    echo "⚠️  Primary RPC is healthy, backup RPC has issues"
elif [[ $BACKUP_OK == true ]]; then
    echo "⚠️  Backup RPC is healthy, primary RPC has issues"
    echo "💡 Consider using backup RPC: $RPC2"
else
    echo "🚨 Both RPCs are having issues!"
fi

echo ""
echo "Frontend will automatically fallback between these RPCs using Viem's fallback transport."
