#!/bin/bash

# Send ETH to user's address using Anvil's pre-funded account
# Usage: ./send-eth.sh

USER_ADDRESS="0x9b7e5d40fCb79bbF4171521F5a8e2e15808f82D7"
AMOUNT="10" # 10 ETH

echo "Sending $AMOUNT ETH to $USER_ADDRESS..."

# Use cast to send ETH from the first pre-funded account
cast send --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --value "${AMOUNT}ether" \
  --rpc-url http://localhost:8545 \
  $USER_ADDRESS

echo "✅ Sent $AMOUNT ETH to $USER_ADDRESS"
echo "Check your balance with: cast balance $USER_ADDRESS --rpc-url http://localhost:8545"
