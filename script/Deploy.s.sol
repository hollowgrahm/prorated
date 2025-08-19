// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";

// Core Protocol Contracts
import "../src/ProratedFactory.sol";
import "../src/ProratedPool.sol";
import "../src/proswap/ProswapFactory.sol";
import "../src/proswap/ProswapRouter.sol";

// Deployer Contracts
import "../src/deployers/TokenDeployer.sol";
import "../src/deployers/PairDeployer.sol";
import "../src/deployers/LiquidityDeployer.sol";
import "../src/deployers/VeNFTDeployer.sol";
import "../src/deployers/GovernorDeployer.sol";
import "../src/deployers/TreasuryDeployer.sol";
import "../src/deployers/ProlendDeployer.sol";

// Prolend Contracts
import "../src/prolend/ProlendFactory.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) ERC20(name, symbol, decimals) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract Deploy is Script {
    // Deployed contract addresses
    address public mockUSDC;
    address public proswapFactory;
    address public proswapRouter;
    address public prolendFactory;
    address public tokenDeployer;
    address public pairDeployer;
    address public liquidityDeployer;
    address public veNFTDeployer;
    address public governorDeployer;
    address public treasuryDeployer;
    address public prolendDeployer;
    address public proratedFactory;

    // Example pools
    address public activePool;
    address public upcomingPool;
    address public successfulPool;
    address public endedSuccessfulPool;

    function run() external {
        vm.startBroadcast();

        console.log("Deploying Prorated Protocol...");
        console.log("Deployer:", msg.sender);

        // Step 1: Deploy Mock USDC for testing
        deployMockUSDC();

        // Step 2: Deploy Proswap Infrastructure
        deployProswapInfrastructure(msg.sender);

        // Step 3: Deploy Prolend Infrastructure
        deployProlendInfrastructure(msg.sender);

        // Step 4: Deploy All Deployer Contracts
        deployDeployerContracts(msg.sender);

        // Step 5: Deploy Prorated Factory
        deployProratedFactory(msg.sender);

        // Step 6: Create Example Pools for Frontend Testing
        createExamplePools();

        // Step 7: Log all deployed addresses
        logDeployedAddresses();

        vm.stopBroadcast();
    }

    function deployMockUSDC() internal {
        console.log("\n=== Deploying Mock USDC ===");

        mockUSDC = address(new MockERC20("USD Coin", "USDC", 6));
        console.log("Mock USDC deployed at:", mockUSDC);

        // Mint USDC to deployer for testing
        MockERC20(mockUSDC).mint(msg.sender, 1000000 * 10 ** 6); // 1M USDC
        console.log("Minted 1M USDC to deployer:", msg.sender);
    }

    function deployProswapInfrastructure(address owner) internal {
        console.log("\n=== Deploying Proswap Infrastructure ===");

        // Deploy Proswap Factory
        proswapFactory = address(new ProswapFactory(owner));
        console.log("Proswap Factory deployed at:", proswapFactory);

        // Deploy Proswap Router
        proswapRouter = address(new ProswapRouter(proswapFactory));
        console.log("Proswap Router deployed at:", proswapRouter);
    }

    function deployProlendInfrastructure(address /* owner */) internal {
        console.log("\n=== Deploying Prolend Infrastructure ===");

        // Deploy Prolend Factory
        prolendFactory = address(new ProlendFactory());
        console.log("Prolend Factory deployed at:", prolendFactory);
    }

    function deployDeployerContracts(address /* owner */) internal {
        console.log("\n=== Deploying Deployer Contracts ===");

        // Deploy Token Deployer
        tokenDeployer = address(new TokenDeployer());
        console.log("Token Deployer deployed at:", tokenDeployer);

        // Deploy Pair Deployer
        pairDeployer = address(new PairDeployer());
        console.log("Pair Deployer deployed at:", pairDeployer);

        // Deploy Liquidity Deployer
        liquidityDeployer = address(new LiquidityDeployer());
        console.log("Liquidity Deployer deployed at:", liquidityDeployer);

        // Deploy VeNFT Deployer
        veNFTDeployer = address(new VeNFTDeployer());
        console.log("VeNFT Deployer deployed at:", veNFTDeployer);

        // Deploy Governor Deployer
        governorDeployer = address(new GovernorDeployer());
        console.log("Governor Deployer deployed at:", governorDeployer);

        // Deploy Treasury Deployer
        treasuryDeployer = address(new TreasuryDeployer());
        console.log("Treasury Deployer deployed at:", treasuryDeployer);

        // Deploy Prolend Deployer
        prolendDeployer = address(new ProlendDeployer(prolendFactory));
        console.log("Prolend Deployer deployed at:", prolendDeployer);
    }

    function deployProratedFactory(address owner) internal {
        console.log("\n=== Deploying Prorated Factory ===");

        proratedFactory = address(
            new ProratedFactory(
                owner,
                proswapFactory,
                proswapRouter,
                tokenDeployer,
                pairDeployer,
                liquidityDeployer,
                veNFTDeployer,
                governorDeployer,
                treasuryDeployer,
                prolendDeployer
            )
        );
        console.log("Prorated Factory deployed at:", proratedFactory);
    }

    function createExamplePools() internal {
        console.log("\n=== Creating Example Pools ===");

        uint256 currentTime = block.timestamp;

        // Create Active Pool (started 1 hour ago, ends in 7 days)
        activePool = createPool(
            "Active Token",
            "ACTIVE",
            1000000 * 10 ** 18, // 1M tokens
            50000 * 10 ** 6, // 50K USDC dev fund
            50000 * 10 ** 6, // 50K USDC liquidity fund
            currentTime - 1 hours, // Started 1 hour ago
            currentTime + 7 days, // Ends in 7 days
            bytes32("active")
        );
        console.log("Active Pool created at:", activePool);

        // Create Upcoming Pool (starts in 2 days, ends in 9 days)
        upcomingPool = createPool(
            "Upcoming Token",
            "UPCOMING",
            2000000 * 10 ** 18, // 2M tokens
            75000 * 10 ** 6, // 75K USDC dev fund
            75000 * 10 ** 6, // 75K USDC liquidity fund
            currentTime + 2 days, // Starts in 2 days
            currentTime + 9 days, // Ends in 9 days
            bytes32("upcoming")
        );
        console.log("Upcoming Pool created at:", upcomingPool);

        // Create Successful Pool (active for 1 more hour, ready for deployment)
        successfulPool = createPool(
            "Successful Token",
            "SUCCESS",
            500000 * 10 ** 18, // 500K tokens
            30000 * 10 ** 6, // 30K USDC dev fund
            30000 * 10 ** 6, // 30K USDC liquidity fund
            currentTime - 6 days, // Started 6 days ago
            currentTime + 1 hours, // Ends in 1 hour (still active)
            bytes32("successful")
        );
        console.log("Successful Pool created at:", successfulPool);

        // Fund the successful pool to meet minimum requirements
        fundSuccessfulPool();

        // Create Ended Successful Pool (ended 2 days ago, ready for deployment)
        endedSuccessfulPool = createPool(
            "Deploy Ready Token",
            "DEPLOY",
            300000 * 10 ** 18, // 300K tokens
            25000 * 10 ** 6, // 25K USDC dev fund
            25000 * 10 ** 6, // 25K USDC liquidity fund
            currentTime - 9 days, // Started 9 days ago
            currentTime - 2 days, // Ended 2 days ago
            bytes32("deployme")
        );
        console.log("Ended Successful Pool created at:", endedSuccessfulPool);

        // Fund the ended pool (mint directly to the pool since it's ended)
        fundEndedPool();
    }

    function createPool(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 tokenTotalSupply,
        uint256 developmentFund,
        uint256 liquidityFund,
        uint256 startTime,
        uint256 endTime,
        bytes32 salt
    ) internal returns (address) {
        ProratedPool.PoolConfig memory config = ProratedPool.PoolConfig({
            owner: msg.sender,
            tokenName: tokenName,
            tokenSymbol: tokenSymbol,
            tokenTotalSupply: tokenTotalSupply,
            developmentFund: developmentFund,
            liquidityFund: liquidityFund,
            startTime: startTime,
            endTime: endTime,
            fundingToken: mockUSDC,
            developerPercent: 40, // 40% to developer
            treasuryPercent: 30, // 30% to treasury
            daoPercent: 30 // 30% to DAO (users)
        });

        return ProratedFactory(proratedFactory).createPool(config, salt);
    }

    function fundSuccessfulPool() internal {
        console.log("\n=== Funding Successful Pool ===");

        // Get the pool's funding requirements
        ProratedPool pool = ProratedPool(successfulPool);
        uint256 minRequired = pool.minTotalContributions();

        console.log("Minimum required funding:", minRequired);

        // Approve and contribute to meet the minimum (with some extra)
        uint256 contributionAmount = minRequired + 10000 * 10 ** 6; // Add 10K USDC extra
        MockERC20(mockUSDC).mint(address(this), contributionAmount);

        // Approve the pool to spend our USDC
        ERC20(mockUSDC).approve(successfulPool, contributionAmount);

        // Make a contribution with 52 weeks lock (1 year)
        pool.contribute(contributionAmount, 52);

        console.log("Contributed", contributionAmount, "to successful pool");
        console.log("Pool total contributions:", pool.totalContributions());
        console.log("Pool reached minimum:", pool.hasReachedMinimum());
    }

    function fundEndedPool() internal {
        console.log("\n=== Funding Ended Pool ===");

        // Get the pool's funding requirements
        ProratedPool pool = ProratedPool(endedSuccessfulPool);
        uint256 minRequired = pool.minTotalContributions();

        console.log("Minimum required funding:", minRequired);

        // Since the pool is ended, we need to simulate previous contributions
        // by manually setting the pool's state (this is for testing only)
        uint256 contributionAmount = minRequired + 5000 * 10 ** 6; // Add 5K USDC extra

        // For the ended pool, we'll just mint USDC to the pool contract to simulate contributions
        MockERC20(mockUSDC).mint(endedSuccessfulPool, contributionAmount);

        console.log(
            "Simulated",
            contributionAmount,
            "USDC in ended pool for deployment testing"
        );
    }

    function logDeployedAddresses() internal view {
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Mock USDC:", mockUSDC);
        console.log("Proswap Factory:", proswapFactory);
        console.log("Proswap Router:", proswapRouter);
        console.log("Prolend Factory:", prolendFactory);
        console.log("Token Deployer:", tokenDeployer);
        console.log("Pair Deployer:", pairDeployer);
        console.log("Liquidity Deployer:", liquidityDeployer);
        console.log("VeNFT Deployer:", veNFTDeployer);
        console.log("Governor Deployer:", governorDeployer);
        console.log("Treasury Deployer:", treasuryDeployer);
        console.log("Prolend Deployer:", prolendDeployer);
        console.log("Prorated Factory:", proratedFactory);
        console.log("\n=== EXAMPLE POOLS ===");
        console.log("Active Pool:", activePool);
        console.log("Upcoming Pool:", upcomingPool);
        console.log("Successful Pool:", successfulPool);
        console.log("Ended Successful Pool:", endedSuccessfulPool);
        console.log("\n=== Frontend Environment Variables ===");
        console.log("NEXT_PUBLIC_MOCK_USDC_ADDRESS=", mockUSDC);
        console.log("NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS=", proratedFactory);
        console.log("NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS=", proswapFactory);
        console.log("NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS=", proswapRouter);
    }
}
