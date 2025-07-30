# Proswap: 80/20 Weighted Pools on Uniswap V2 Infrastructure

## Overview

Proswap is a fork of [ZuniswapV2](https://github.com/Jeiwan/zuniswapv2) that implements **80/20 weighted pools** using Balancer's mathematical framework while maintaining Uniswap V2's proven infrastructure. This creates a hybrid system that combines the best of both worlds: Uniswap's battle-tested architecture with Balancer's sophisticated weighted pool mathematics.

## Key Innovations

### 🎯 **80/20 Weighted Pools**

Unlike traditional Uniswap V2 pools that use 50/50 weights, Proswap implements **80/20 weighted pools** where:

- The first token gets **80% weight** (favored token)
- The second token gets **20% weight** (disfavored token)

This creates more capital-efficient pools for tokens with different risk profiles or market dynamics.

### 🧮 **Balancer Math Integration**

We've imported and adapted Balancer's mathematical libraries to implement weighted pool invariants:

- **Weighted Math**: Borrowed from Balancer's `WeightedMath` library
- **Weighted Pool Logic**: Adapted Balancer's weighted pool calculations
- **Custom Invariant**: Modified the constant product formula to support 80/20 weights

## Migration Details: From ZuniswapV2 to Proswap

### 🔄 **What Was Replaced**

#### **1. Pair Contract Core Logic**

- **Removed**: Traditional Uniswap V2 `x * y = k` invariant
- **Added**: Balancer V3 weighted math with `x^0.8 * y^0.2 = k` invariant
- **Reasoning**: Enable 80/20 weighted pools while maintaining mathematical soundness

#### **2. Swap Calculation Functions**

- **Removed**: `getAmountOut()` and `getAmountIn()` using constant product formula
- **Added**: Weighted pool swap calculations from Balancer's `WeightedMath`
- **Reasoning**: Accurate price calculations for weighted token exchanges

#### **3. Liquidity Minting/Burning Logic**

- **Removed**: 50/50 liquidity distribution based on geometric mean
- **Added**: 80/20 weighted liquidity calculations
- **Reasoning**: Proper liquidity provision for weighted pools

#### **4. Price Oracle Implementation**

- **Removed**: Traditional cumulative price tracking
- **Added**: Weighted cumulative price tracking for 80/20 ratios
- **Reasoning**: Accurate price feeds for weighted token pairs

### 🗑️ **What Was Removed**

#### **1. Uniswap V2 Math Library**

- **Removed**: `Math.sol` with traditional AMM calculations
- **Reasoning**: Replaced with Balancer's more sophisticated weighted math

#### **2. Standard Pair Naming**

- **Removed**: Static "Zuniswap V2" naming convention
- **Added**: Dynamic naming based on token symbols
- **Reasoning**: Better UX with descriptive pair names showing weights

#### **3. Traditional Router Logic**

- **Removed**: Standard Uniswap V2 router calculations
- **Added**: Weighted pool optimized router functions
- **Reasoning**: Proper handling of 80/20 token swaps and liquidity

### 🏗️ **What Was Preserved**

#### **1. Factory Pattern & CREATE2**

- **Preserved**: Deterministic pair creation using CREATE2
- **Reasoning**: Maintain address predictability for integrations

#### **2. Security Model**

- **Preserved**: Re-entrancy protection, safe transfers, input validation
- **Reasoning**: Uniswap V2's battle-tested security approach

#### **3. Router Interface**

- **Preserved**: Standard `addLiquidity()`, `removeLiquidity()`, `swap()` functions
- **Reasoning**: Maintain compatibility with existing DeFi infrastructure

#### **4. Library Structure**

- **Preserved**: Price calculation and quote functions
- **Modified**: Adapted for weighted pool mathematics
- **Reasoning**: Keep familiar API while supporting new functionality

### 🎯 **Key Design Decisions**

#### **1. Fixed 80/20 Weights**

- **Decision**: Hard-coded 80/20 ratio instead of configurable weights
- **Reasoning**: Simplicity, gas efficiency, and clear use cases

#### **2. Token Order Significance**

- **Decision**: First token always gets 80% weight, second gets 20%
- **Reasoning**: Clear, predictable behavior for users and integrators

#### **3. Dynamic Naming with CREATE2**

- **Decision**: Update names in `initialize()` while preserving CREATE2 determinism
- **Reasoning**: Best of both worlds - predictable addresses with descriptive names

#### **4. Balancer Math Integration**

- **Decision**: Import Balancer's weighted math rather than reimplementing
- **Reasoning**: Leverage battle-tested, audited mathematical functions

### 🏗️ **Uniswap V2 Infrastructure**

Built on top of ZuniswapV2's modern Solidity 0.8.10 implementation:

- **Factory Pattern**: CREATE2 deterministic pair creation
- **Router Contract**: Standardized swap and liquidity operations
- **Library Functions**: Price calculations and quote functions
- **Security Features**: Re-entrancy protection, safe transfers

## Mathematical Foundation

### Traditional Uniswap V2 (50/50)

```
x * y = k
```

### Proswap (80/20 Weighted)

```
x^0.8 * y^0.2 = k
```

Where:

- `x` = reserve of token with 80% weight
- `y` = reserve of token with 20% weight
- `k` = constant product invariant

### Price Impact Calculation

The weighted formula creates different price impact curves:

- **Favored token (80%)**: Lower price impact for large trades
- **Disfavored token (20%)**: Higher price impact, encouraging balanced liquidity

## Architecture

### Core Contracts

1. **`ProswapFactory.sol`**

   - Creates pairs with deterministic addresses (CREATE2)
   - Manages pair registry
   - Implements weighted pool creation logic

2. **`ProswapPair.sol`**

   - Implements 80/20 weighted pool logic
   - Uses Balancer's weighted math for swaps
   - Dynamic naming: `"Proswap 80 WETH / 20 USDC"`
   - Maintains Uniswap V2's proven security model

3. **`ProswapRouter.sol`**

   - Standardized swap and liquidity operations
   - Optimized routing for weighted pools
   - Compatible with existing Uniswap V2 interfaces

4. **`ProswapLibrary.sol`**
   - Price calculation functions
   - Quote and amount calculations
   - Weighted pool specific utilities

### Borrowed Libraries

#### From Balancer

- **Weighted Math**: Core mathematical functions for weighted pools
- **Invariant Calculations**: Constant weighted product formula
- **Swap Logic**: Weighted token exchange algorithms

#### From ZuniswapV2

- **Factory Pattern**: CREATE2 deterministic deployment
- **Router Interface**: Standardized swap operations
- **Security Model**: Re-entrancy protection, safe transfers
- **Library Functions**: Price and quote calculations

## Getting Started

### Prerequisites

1. **Rust and Cargo**: [Install Rust](https://www.rust-lang.org/tools/install)
2. **Foundry**: `cargo install --git https://github.com/gakonst/foundry --bin forge --locked`

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd prorated

# Install dependencies
git submodule update --init --recursive

# Run tests
forge test
```

## Testing

Run the comprehensive test suite:

```bash
forge test
```

Key test categories:

- **Factory Tests**: Pair creation and management
- **Pair Tests**: Core weighted pool functionality
- **Router Tests**: Swap and liquidity operations
- **Library Tests**: Mathematical calculations
- **Dynamic Naming Tests**: Token naming functionality

## Security Features

- **Re-entrancy Protection**: Standard Uniswap V2 security model
- **Safe Transfers**: ERC20 transfer safety checks
- **Input Validation**: Comprehensive parameter validation
- **CREATE2 Determinism**: Predictable pair addresses
- **Weighted Math Safety**: Balancer's battle-tested calculations

## Acknowledgments

- **ZuniswapV2**: Modern Uniswap V2 implementation by [Jeiwan](https://github.com/Jeiwan)
- **Balancer**: Weighted pool mathematics and algorithms - [Balancer V3](https://github.com/balancer/balancer-v3-monorepo)
- **Uniswap V2**: Proven AMM architecture and security model - [Uniswap V2](https://github.com/Uniswap/v2-core)
