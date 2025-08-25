// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {ERC20} from "lib/solmate/src/tokens/ERC20.sol";

// Demo Contracts
import "../src/demo/MockUSDC.sol";
import "../src/demo/DemoProratedFactory.sol";
import "../src/demo/DemoProratedPool.sol";

// Core Protocol Contracts (reuse existing infrastructure)
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

contract DeployDemo is Script {
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
    address public demoProratedFactory;

    // Demo pools
    address public activePool;
    address public successfulPool;
    address public failedPool;
    address public launchedPool;

    function run() external {
        vm.startBroadcast();

        console.log("Deploying Prorated Protocol Demo...");
        console.log("Deployer:", msg.sender);

        // Step 1: Deploy Demo MockUSDC with faucet
        deployMockUSDC();

        // Step 2: Deploy Proswap Infrastructure
        deployProswapInfrastructure(msg.sender);

        // Step 3: Deploy Prolend Infrastructure
        deployProlendInfrastructure(msg.sender);

        // Step 4: Deploy All Deployer Contracts
        deployDeployerContracts(msg.sender);

        // Step 5: Deploy Demo Prorated Factory
        deployDemoProratedFactory(msg.sender);

        // Step 6: Create Demo Pools for Testing
        createDemoPools();

        // Step 7: Register demo contracts with MockUSDC for auto-approval
        registerDemoContracts();

        // Step 8: Fund pools after registration
        fundDemoPools();

        // Step 9: Log all deployed addresses
        logDeployedAddresses();

        vm.stopBroadcast();
    }

    function deployMockUSDC() internal {
        console.log("\n=== Deploying Demo MockUSDC ===");

        mockUSDC = address(new MockUSDC());
        console.log("Demo MockUSDC deployed at:", mockUSDC);

        // Mint some USDC to deployer for testing
        MockUSDC(mockUSDC).faucet();
        console.log("Claimed 1000 USDC from faucet for deployer");
    }

    function deployProswapInfrastructure(address owner) internal {
        console.log("\n=== Deploying Proswap Infrastructure ===");

        proswapFactory = address(new ProswapFactory(owner));
        console.log("Proswap Factory deployed at:", proswapFactory);

        proswapRouter = address(new ProswapRouter(proswapFactory));
        console.log("Proswap Router deployed at:", proswapRouter);
    }

    function deployProlendInfrastructure(address /* owner */) internal {
        console.log("\n=== Deploying Prolend Infrastructure ===");

        prolendFactory = address(new ProlendFactory());
        console.log("Prolend Factory deployed at:", prolendFactory);
    }

    function deployDeployerContracts(address /* owner */) internal {
        console.log("\n=== Deploying Deployer Contracts ===");

        tokenDeployer = address(new TokenDeployer());
        console.log("Token Deployer deployed at:", tokenDeployer);

        pairDeployer = address(new PairDeployer());
        console.log("Pair Deployer deployed at:", pairDeployer);

        liquidityDeployer = address(new LiquidityDeployer());
        console.log("Liquidity Deployer deployed at:", liquidityDeployer);

        veNFTDeployer = address(new VeNFTDeployer());
        console.log("VeNFT Deployer deployed at:", veNFTDeployer);

        governorDeployer = address(new GovernorDeployer());
        console.log("Governor Deployer deployed at:", governorDeployer);

        treasuryDeployer = address(new TreasuryDeployer());
        console.log("Treasury Deployer deployed at:", treasuryDeployer);

        prolendDeployer = address(new ProlendDeployer(prolendFactory));
        console.log("Prolend Deployer deployed at:", prolendDeployer);
    }

    function deployDemoProratedFactory(address owner) internal {
        console.log("\n=== Deploying Demo Prorated Factory ===");

        demoProratedFactory = address(
            new DemoProratedFactory(
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
        console.log("Demo Prorated Factory deployed at:", demoProratedFactory);
    }

    function createDemoPools() internal {
        console.log("\n=== Creating Demo Pools ===");

        uint256 currentTime = block.timestamp;

        // 1. Active Pool (accepting contributions) - Gaming/Entertainment focus
        activePool = createDemoPool(
            "GameFi Protocol",
            "GAMEFI",
            10000000 * 10 ** 18, // 10M tokens
            150000 * 10 ** 6, // 150K USDC dev fund (30%)
            350000 * 10 ** 6, // 350K USDC liquidity fund (70%)
            currentTime - 1 hours, // Started 1 hour ago
            currentTime + 7 days, // Ends in 7 days
            bytes32("demo-active")
        );
        console.log("Demo Active Pool created at:", activePool);

        // 2. Successful Pool (ready for deployment) - DeFi Infrastructure
        successfulPool = createDemoPool(
            "DeFi Yield Optimizer",
            "DEFIYO",
            5000000 * 10 ** 18, // 5M tokens
            200000 * 10 ** 6, // 200K USDC dev fund (40%)
            300000 * 10 ** 6, // 300K USDC liquidity fund (60%)
            currentTime - 6 days, // Started 6 days ago
            currentTime - 1 days, // Ended 1 day ago
            bytes32("demo-success")
        );
        console.log("Demo Successful Pool created at:", successfulPool);

        // 3. Failed Pool (for refund testing) - AI/ML Platform
        failedPool = createDemoPool(
            "AI Compute Network",
            "AICOMP",
            8000000 * 10 ** 18, // 8M tokens
            400000 * 10 ** 6, // 400K USDC dev fund (50%)
            400000 * 10 ** 6, // 400K USDC liquidity fund (50%)
            currentTime - 10 days, // Started 10 days ago
            currentTime - 3 days, // Ended 3 days ago
            bytes32("demo-failed")
        );
        console.log("Demo Failed Pool created at:", failedPool);

        // 4. Launched Pool (fully deployed ecosystem) - Social/Creator Economy
        launchedPool = createDemoPool(
            "Creator Economy DAO",
            "CREATOR",
            15000000 * 10 ** 18, // 15M tokens
            300000 * 10 ** 6, // 300K USDC dev fund (60%)
            200000 * 10 ** 6, // 200K USDC liquidity fund (40%)
            currentTime - 30 days, // Started 30 days ago
            currentTime - 23 days, // Ended 23 days ago
            bytes32("demo-launched")
        );
        console.log("Demo Launched Pool created at:", launchedPool);

        // Fund the successful pool to meet minimum requirements
        // fundSuccessfulPool(); // This will be called by fundDemoPools()

        // Simulate launched pool (fully deployed)
        // simulateLaunchedPool(); // This will be called by fundDemoPools()
    }

    function createDemoPool(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 tokenTotalSupply,
        uint256 developmentFund,
        uint256 liquidityFund,
        uint256 startTime,
        uint256 endTime,
        bytes32 salt
    ) internal returns (address) {
        DemoProratedPool.PoolConfig memory config = DemoProratedPool
            .PoolConfig({
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

        return
            DemoProratedFactory(demoProratedFactory).createPool(config, salt);
    }

    function fundSuccessfulPool() internal {
        console.log("\n=== Funding Successful Pool ===");

        DemoProratedPool pool = DemoProratedPool(successfulPool);
        uint256 minRequired = pool.minTotalContributions();

        console.log("Minimum required funding:", minRequired);

        // Get USDC from faucet for funding (need more for larger amounts)
        for (uint i = 0; i < 60; i++) {
            MockUSDC(mockUSDC).faucet(); // Get 600K USDC total
        }

        // Rewind time to make pool active for contribution
        pool.rewindTime(5 days);

        // Make a contribution to meet minimum + extra
        uint256 contributionAmount = minRequired + 50000 * 10 ** 6; // Add 50K USDC extra
        pool.contribute(contributionAmount, 52); // 52 weeks lock

        // Skip time forward to end the pool
        pool.skipTime(5 days);

        console.log("Contributed", contributionAmount, "to successful pool");
        console.log("Pool total contributions:", pool.totalContributions());
        console.log("Pool reached minimum:", pool.hasReachedMinimum());
    }

    function simulateLaunchedPool() internal {
        console.log("\n=== Simulating Launched Pool ===");

        DemoProratedPool pool = DemoProratedPool(launchedPool);
        uint256 minRequired = pool.minTotalContributions();

        // Get USDC from faucet (need more for larger amounts)
        for (uint i = 0; i < 70; i++) {
            MockUSDC(mockUSDC).faucet(); // Get 700K USDC total
        }

        // Rewind time to make pool active
        pool.rewindTime(25 days);

        // Make a large contribution
        uint256 contributionAmount = minRequired + 100000 * 10 ** 6; // Add 100K USDC extra
        pool.contribute(contributionAmount, 104); // 2 years lock

        // Skip time forward to current
        pool.skipTime(25 days);

        console.log("Simulated launched pool with", contributionAmount, "USDC");
        console.log("Pool reached minimum:", pool.hasReachedMinimum());
    }

    function fundActivePool() internal {
        console.log("\n=== Funding Active Pool (~10%) ===");

        DemoProratedPool pool = DemoProratedPool(activePool);
        uint256 minRequired = pool.minTotalContributions();

        // Get USDC from faucet
        for (uint i = 0; i < 6; i++) {
            MockUSDC(mockUSDC).faucet(); // Get 60K USDC total
        }

        // Fund to ~10% of minimum (50K out of 500K)
        uint256 contributionAmount = 50000 * 10 ** 6; // 50K USDC
        pool.contribute(contributionAmount, 26); // 26 weeks lock

        console.log("Contributed", contributionAmount, "to active pool");
        console.log("Pool total contributions:", pool.totalContributions());
        console.log("Pool progress: ~10%");
    }

    function fundFailedPool() internal {
        console.log("\n=== Funding Failed Pool (Partially) ===");

        DemoProratedPool pool = DemoProratedPool(failedPool);
        uint256 minRequired = pool.minTotalContributions();

        // Get USDC from faucet
        for (uint i = 0; i < 25; i++) {
            MockUSDC(mockUSDC).faucet(); // Get 250K USDC total
        }

        // Rewind time to make pool active for contribution
        pool.rewindTime(8 days);

        // Fund to ~30% of minimum (240K out of 800K) - not enough to succeed
        uint256 contributionAmount = 240000 * 10 ** 6; // 240K USDC
        pool.contribute(contributionAmount, 78); // 78 weeks lock

        // Skip time forward to end the pool
        pool.skipTime(8 days);

        console.log("Contributed", contributionAmount, "to failed pool");
        console.log("Pool total contributions:", pool.totalContributions());
        console.log("Pool reached minimum:", pool.hasReachedMinimum());
        console.log("Pool progress: ~30% (intentionally failed)");
    }

    function fundDemoPools() internal {
        console.log("\n=== Funding Demo Pools ===");

        fundActivePool();
        fundSuccessfulPool();
        fundFailedPool();
        simulateLaunchedPool();

        console.log("Demo pools funded successfully");
    }

    function registerDemoContracts() internal {
        console.log("\n=== Registering Demo Contracts for Auto-Approval ===");

        MockUSDC usdcContract = MockUSDC(mockUSDC);

        // Register all demo pools for auto-approval
        usdcContract.addDemoContract(activePool);
        usdcContract.addDemoContract(successfulPool);
        usdcContract.addDemoContract(failedPool);
        usdcContract.addDemoContract(launchedPool);

        console.log("Registered demo pools for USDC auto-approval");
    }

    function logDeployedAddresses() internal view {
        console.log("\n=== DEMO DEPLOYMENT SUMMARY ===");
        console.log("Demo MockUSDC:", mockUSDC);
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
        console.log("Demo Prorated Factory:", demoProratedFactory);
        console.log("\n=== DEMO POOLS ===");
        console.log("Active Pool:", activePool);
        console.log("Successful Pool:", successfulPool);
        console.log("Failed Pool:", failedPool);
        console.log("Launched Pool:", launchedPool);
        console.log("\n=== Frontend Environment Variables ===");
        console.log("NEXT_PUBLIC_MOCK_USDC_ADDRESS=", mockUSDC);
        console.log(
            "NEXT_PUBLIC_PRORATED_FACTORY_ADDRESS=",
            demoProratedFactory
        );
        console.log("NEXT_PUBLIC_PROSWAP_FACTORY_ADDRESS=", proswapFactory);
        console.log("NEXT_PUBLIC_PROSWAP_ROUTER_ADDRESS=", proswapRouter);
        console.log("NEXT_PUBLIC_PROLEND_FACTORY_ADDRESS=", prolendFactory);
        console.log("NEXT_PUBLIC_TOKEN_DEPLOYER_ADDRESS=", tokenDeployer);
        console.log("NEXT_PUBLIC_PAIR_DEPLOYER_ADDRESS=", pairDeployer);
        console.log(
            "NEXT_PUBLIC_LIQUIDITY_DEPLOYER_ADDRESS=",
            liquidityDeployer
        );
        console.log("NEXT_PUBLIC_VENFT_DEPLOYER_ADDRESS=", veNFTDeployer);
        console.log("NEXT_PUBLIC_GOVERNOR_DEPLOYER_ADDRESS=", governorDeployer);
        console.log("NEXT_PUBLIC_TREASURY_DEPLOYER_ADDRESS=", treasuryDeployer);
        console.log("NEXT_PUBLIC_PROLEND_DEPLOYER_ADDRESS=", prolendDeployer);
        console.log("NEXT_PUBLIC_ACTIVE_POOL_ADDRESS=", activePool);
        console.log("NEXT_PUBLIC_SUCCESSFUL_POOL_ADDRESS=", successfulPool);
    }
}
