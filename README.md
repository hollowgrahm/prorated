# Prorated Protocol: Next-Generation Token Launch Platform

**🚀 Fair Launch • 🎯 80/20 Governance • 💧 Instant Liquidity • 🗳️ Progressive Democracy**

## Overview

**Prorated Protocol** is a revolutionary token launch platform that implements [Balancer's 80/20 Initiative](https://medium.com/balancer-protocol/the-8020-initiative-64a7a6cab976) for next-generation tokenomics. By combining fair crowdfunding, automatic liquidity deployment, and innovative governance mechanics, Prorated solves the core problems of traditional token launches.

### 🎯 **Core Innovation**

Traditional governance removes liquidity from markets. **Prorated does the opposite** - governance participation _increases_ trading liquidity through its 80/20 weighted pool design.

## 🏗️ **Complete Ecosystem Architecture**

### **1. 💰 Prorated Protocol (Fair Launch Platform)**

The core fundraising and deployment infrastructure:

- **`ProratedFactory.sol`** - Creates and validates new token launch pools
- **`ProratedPool.sol`** - Manages crowdfunding with commitment-weighted shares
- **Deployment System** - Automatically launches complete token ecosystems

Think of Prorated Protocol as the "launch pad" that orchestrates everything. When a project wants to launch their token, they don't need to manually deploy contracts, set up liquidity, or figure out governance - Prorated handles it all automatically. The Factory validates that launch parameters make sense (preventing rug pulls), while the Pool contract manages the actual crowdfunding where users commit both funds and time. What's unique is that longer commitment periods give you more shares, aligning everyone's incentives toward long-term success rather than quick flips.

### **2. 🌊 Proswap (Custom 80/20 AMM)**

Modern Solidity 0.8.10 implementation of weighted pools:

- **`ProswapFactory.sol`** - Creates deterministic 80/20 pair addresses
- **`ProswapPair.sol`** - Implements `x^0.8 * y^0.2 = k` weighted invariant
- **`ProswapRouter.sol`** - Optimized routing for 80/20 swaps
- **`ProswapLibrary.sol`** - Balancer-derived weighted math calculations

Proswap is where the magic happens for trading. Unlike Uniswap's 50/50 pools where both tokens have equal weight, Proswap creates 80/20 weighted pools - meaning one token (usually the project token) gets 80% weight while the other (usually ETH or a stablecoin) gets 20%. This isn't just a technical change; it fundamentally improves economics for governance tokens. When you trade large amounts of the project token, you get much better prices than you would in a 50/50 pool. Plus, liquidity providers get most of their exposure to the project token they believe in, while still having some stability from the 20% base asset.

### **3. 🗳️ Progressive Governance System**

Advanced voting escrow with unique innovations:

- **`ProratedVeNFT.sol`** - Withdrawable decay + auto-compounding rewards
- **`ProratedGovernor.sol`** - DAO governance with proposal management
- **`ProratedTreasury.sol`** - Community-controlled treasury operations

Here's where Prorated gets really innovative. Traditional governance systems make you choose: either have your tokens locked and unusable, or give up your voting power. Prorated's VeNFT system says "why not both?" You lock your LP tokens and get an NFT that represents your voting power, but as time passes and your voting power naturally decays, you can withdraw that decayed portion while keeping the rest locked. Even better, when the protocol distributes rewards, they automatically compound into your locked position, increasing both your token balance and future voting power. It's like earning interest that makes your vote stronger over time.

## 🚀 **How It Works: Complete Token Launch Flow**

### **Phase 1: Fair Crowdfunding**

```
Users commit funding + lock duration → Shares = amount × lockTime
Minimum threshold required or automatic refunds
Longer commitments = more governance power
```

The crowdfunding phase is where fairness meets commitment. Instead of just throwing money at a project and hoping for the best, you're making a dual commitment: how much you want to contribute AND how long you're willing to lock your tokens. Someone who contributes $1000 for 1 year gets the same shares as someone who contributes $500 for 2 years - because both show the same level of commitment. This prevents mercenary capital from dominating launches and ensures the people with the most governance power are those most invested in long-term success.

### **Phase 2: Automatic Ecosystem Deployment**

```
1. Deploy ERC20 token with custom parameters
2. Create 80/20 Proswap pair (80% project token / 20% funding token)
3. Seed initial liquidity from raised funds
4. Deploy VeNFT governance using LP tokens
5. Deploy Governor + Treasury contracts
6. Distribute LP tokens to contributors based on commitment shares
```

This is where the "magic" happens - and it's completely automated. Once the crowdfunding succeeds, Prorated becomes like a highly efficient robot that deploys an entire DeFi ecosystem in one transaction. It mints the project's tokens, creates a weighted trading pool with optimal 80/20 economics, seeds it with liquidity using the raised funds, and sets up a complete governance system. What used to take teams weeks of manual work, multiple transactions, and complex coordination now happens automatically. Contributors end up with LP tokens representing their share of the liquidity pool, which become their governance tokens in the new DAO.

### **Phase 3: 80/20 Governance (ve8020)**

```
LP tokens → Lock in VeNFT → Voting power that decays over time
Governance participation = More liquidity in AMM (not less!)
Auto-compounding rewards increase voting power
Gradual unlocking provides ongoing liquidity access
```

This final phase is where Prorated flips traditional governance economics on its head. In most protocols, when you stake tokens for governance, that liquidity disappears from trading markets. But with Prorated's 80/20 system, your locked LP tokens stay active in the trading pool! So paradoxically, the more people participate in governance, the deeper the liquidity becomes for traders. Meanwhile, you're earning both trading fees from the AMM and governance rewards that automatically compound into your position. As your voting power naturally decays over time, you can gradually unlock portions of your tokens while keeping the rest working for you.

## 🎯 **Revolutionary Features**

### **💧 Liquidity-Positive Governance**

Unlike traditional models where staking removes liquidity:

- **Staked tokens stay active** in 80/20 trading pools
- **More governance = More liquidity** available for trading
- **Deep liquidity pools** with reduced slippage
- **Self-sustaining incentives** from swap fees

This is the breakthrough that makes everything else possible. Traditional DeFi has a fundamental problem: the more people participate in governance, the less liquidity is available for trading. It's like a tug-of-war between democracy and efficiency. Prorated solves this by making governance tokens into LP tokens that stay active in trading pools. The result? Protocols that get more liquid as they get more democratic. It's a positive feedback loop where community engagement directly benefits all users through better trading experiences.

### **🔄 Advanced VeNFT System**

Unique innovations beyond standard vote escrow:

- **`withdrawDecayed()`** - Access decayed tokens gradually (not just at expiration)
- **Auto-compounding rewards** - Rewards increase locked amount and voting power
- **Reward preservation** - Never lose rewards during lock extensions
- **Flexible management** - Increase amount or duration without penalties

Think of traditional vote escrow like a time-locked safe - your tokens go in, and you wait until the timer runs out to get them back. Prorated's VeNFT system is more like a savings account with a declining balance available for early withdrawal. As your voting power naturally decays over time, you can withdraw that decayed portion whenever you want. Meanwhile, any rewards you earn don't just sit separately - they automatically compound back into your locked position, growing both your token balance and your future voting power. It's designed for people who want to be involved long-term but still maintain some financial flexibility.

### **⚖️ 80/20 Economic Benefits**

Following [Balancer's proven model](https://medium.com/balancer-protocol/the-8020-initiative-64a7a6cab976):

- **Asymmetric upside** - 80% exposure to project token, 20% to stable asset
- **Reduced impermanent loss** - Better than 50/50 pools for governance tokens
- **Price stability** - 20% base asset acts as hedge during volatility
- **Capital efficiency** - Concentrated liquidity vs fragmented markets

The 80/20 ratio isn't arbitrary - it's the sweet spot that Balancer discovered after years of real-world testing. If you believe in a project token, you want most of your exposure to be in that token, not split 50/50 with something else. But you also want some stability, which the 20% base asset provides. This creates a natural hedge: when markets are volatile, the 20% acts as a stabilizer, and when the project token rises, you get most of the upside. For governance tokens especially, this beats traditional 50/50 pools because it minimizes the painful impermanent loss that happens when your governance token appreciates significantly.

### **🚀 Fair Launch Mechanics**

- **Commitment-weighted shares** - Longer lock commitments = more influence
- **Minimum threshold protection** - Automatic refunds if target not met
- **No presales or insider allocations** - Equal opportunity participation
- **Time-weighted fairness** - Early supporters with longer commitments rewarded

Fairness in token launches is about more than just "everyone can participate" - it's about ensuring the people with the most influence are those most committed to long-term success. Prorated's commitment-weighted system means that someone who's willing to lock their tokens for longer gets more governance shares, even if they contribute the same dollar amount. This creates natural selection for long-term thinking. There are no private sales, no team allocations, no VC rounds - just a public crowdfunding where your influence is directly proportional to your demonstrated commitment to the project's future.

## 🧮 **Mathematical Foundation**

### **Traditional AMM (Uniswap V2)**

```
x * y = k (50/50 constant product)
```

### **Proswap 80/20 Weighted Pools**

```
x^0.8 * y^0.2 = k (weighted constant product)
```

**Benefits:**

- **Favored token (80%)**: Lower price impact for large trades
- **Base token (20%)**: Provides stability and reduces impermanent loss
- **Better capital efficiency** for governance tokens vs stablecoins/ETH

The math might look complex, but the intuition is simple: weighted pools create price curves that favor one token over another. In traditional Uniswap pools, buying a lot of one token causes massive price impact because you're fighting against the 50/50 balance. With 80/20 pools, large purchases of the favored token (usually the project token) cause much less price impact, making them more suitable for governance tokens that see large directional flows. The mathematical foundation comes from Balancer's years of research and battle-testing, ensuring the invariants remain stable even under extreme market conditions.

## 🏗️ **Technical Architecture**

### **Core Contracts**

| Contract           | Purpose                      | Size Optimized |
| ------------------ | ---------------------------- | -------------- |
| `ProratedFactory`  | Deploy and validate pools    | ✅             |
| `ProratedPool`     | Crowdfunding + orchestration | ✅             |
| `ProswapFactory`   | Create 80/20 pairs           | ✅             |
| `ProswapPair`      | Weighted AMM implementation  | ✅             |
| `ProswapRouter`    | Optimized routing            | ✅             |
| `ProratedVeNFT`    | Advanced governance NFTs     | ✅             |
| `ProratedGovernor` | DAO governance               | ✅             |
| `ProratedTreasury` | Community treasury           | ✅             |

### **Deployment Modularity**

Specialized deployer contracts for gas efficiency:

- `TokenDeployer` - Custom ERC20 tokens
- `PairDeployer` - 80/20 Proswap pairs
- `VeNFTDeployer` - Governance NFT contracts
- `GovernorDeployer` - DAO governance
- `TreasuryDeployer` - Community treasuries

Rather than having one massive contract trying to deploy everything, Prorated uses a modular approach where each deployer is specialized for one task. This isn't just good software engineering - it's a practical necessity because of Ethereum's contract size limits. Each deployer can be highly optimized for its specific deployment pattern, and the main Pool contract just orchestrates calls to each one. Think of it like having different specialists on a construction crew rather than one person trying to do electrical, plumbing, and framing all at once.

### **Size Optimization Strategy**

All contracts stay under EIP-170 limit (24,576 bytes):

- **Library splitting** - Math libraries deployed separately
- **Modular deployers** - Specialized deployment contracts
- **Bytecode holders** - External storage for creation code
- **Inline optimizations** - Single-use modifiers inlined

The 24KB contract size limit isn't just a theoretical constraint - it's a real wall that many DeFi protocols hit. Prorated was designed from the ground up to stay within these limits using several clever techniques. Large math libraries are deployed once and called via DELEGATECALL rather than being copied into every contract. When contracts need to deploy other contracts, the creation bytecode is stored in separate "holder" contracts rather than being embedded directly. These optimizations ensure that every contract can be deployed on Ethereum without sacrificing functionality.

## 🛠️ **Development & Testing**

### **Prerequisites**

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundry-up

# Verify installation
forge --version
```

### **Setup**

```bash
# Clone repository
git clone <repository-url>
cd prorated

# Install dependencies
git submodule update --init --recursive

# Build contracts
forge build

# Check contract sizes
forge build --sizes

# Run tests
forge test
```

### **Test Coverage**

Comprehensive test suite covering:

- **Crowdfunding mechanics** - Fair launch and share allocation
- **Automatic deployment** - Complete ecosystem creation
- **80/20 AMM functionality** - Weighted swaps and liquidity
- **Advanced VeNFT features** - Decay withdrawal and compounding
- **Governance operations** - Proposal creation and execution
- **Security scenarios** - Reentrancy, access control, edge cases

## 🎯 **Use Cases & Examples**

### **For Projects**

- **Fair token launches** without presales or insider access
- **Instant liquidity** with 80/20 economics from day one
- **Built-in governance** with progressive voting power
- **Community treasury** with automatic allocation
- **Sustainable tokenomics** via Balancer's proven 80/20 model

### **For Contributors**

- **Fair participation** based on commitment and lock duration
- **Governance rights** through LP token voting
- **Dual income streams** - Swap fees + governance rewards
- **Flexible liquidity** - Gradual unlocking via decay withdrawal
- **Compound growth** - Auto-compounding increases voting power

### **For the Ecosystem**

- **More efficient capital allocation** vs traditional launches
- **Increased trading liquidity** from governance participation
- **Reduced mercenary farming** through commitment requirements
- **Sustainable protocols** with aligned long-term incentives

## 🔒 **Security Features**

- **Battle-tested foundations** - Built on Uniswap V2 + Balancer patterns
- **Comprehensive access controls** - Role-based authorization throughout
- **Reentrancy protection** - All external calls properly guarded
- **Safe math operations** - Solidity 0.8+ overflow protection
- **Input validation** - Extensive parameter checking
- **Audit-ready architecture** - Clean, modular design

## 🏆 **Comparison to Alternatives**

| Feature                 | Traditional Launches          | Prorated Protocol           |
| ----------------------- | ----------------------------- | --------------------------- |
| **Launch fairness**     | Presales, insider allocations | Public crowdfunding only    |
| **Liquidity creation**  | Manual, fragmented            | Automatic 80/20 pools       |
| **Governance impact**   | Reduces available liquidity   | Increases trading liquidity |
| **Token economics**     | Often unsustainable           | Proven 80/20 model          |
| **Treasury management** | Centralized control           | Community governance        |
| **Reward mechanics**    | Basic staking                 | Auto-compounding growth     |
| **Liquidity access**    | Locked until expiration       | Gradual decay withdrawal    |

This comparison table tells the story of why we needed to build something new. Traditional token launches are broken in systematic ways: they favor insiders over community, create liquidity problems through poor tokenomics, and lock participants into rigid systems that don't adapt to changing needs. Prorated Protocol addresses each of these issues with principled solutions that have been proven in the wild by protocols like Balancer. The result is a launch platform that creates stronger, more sustainable protocols while being fairer to participants.

## 🚀 **Why This Matters**

**Prorated Protocol represents the next evolution in token launches:**

1. **Solves the liquidity paradox** - Governance increases rather than decreases trading liquidity
2. **Implements proven economics** - Balancer's 80/20 model with years of real-world success
3. **Automates best practices** - Complete ecosystem deployment with optimal configurations
4. **Rewards long-term thinking** - Commitment-based shares and compounding rewards
5. **Creates sustainable protocols** - Aligned incentives and community ownership

## 🙏 **Acknowledgments**

- **[Balancer Protocol](https://balancer.fi)** - 80/20 Initiative and weighted math libraries
- **[Uniswap V2](https://github.com/Uniswap/v2-core)** - Proven AMM architecture and security model
- **[Curve Finance](https://curve.fi)** - Vote escrow governance inspiration
- **[Solmate](https://github.com/transmissions11/solmate)** - Gas-optimized Solidity building blocks

---

**Built with ❤️ for the future of fair, sustainable, and community-driven token launches.**

_Prorated Protocol: Where governance participation increases protocol liquidity._
