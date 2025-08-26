// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/DemoProratedFactory.sol";
import "../../src/demo/DemoProratedPool.sol";

contract CreateDemoPools is Script {
    function run(address factoryAddress, address mockUSDCAddress) external {
        vm.startBroadcast();

        console.log("=== Creating Demo Pools ===");
        console.log("Deployer:", msg.sender);

        DemoProratedFactory factory = DemoProratedFactory(factoryAddress);
        uint256 currentTime = block.timestamp;

        // 1. Active Pool (accepting contributions) - 10x larger amounts
        console.log("Creating DemoActive pool...");
        address activePool = createDemoPoolWithAllocations(
            factory,
            mockUSDCAddress,
            "GameFi Protocol",
            "GAMEFI",
            100000000 * 10 ** 18, // 100M tokens (10x)
            1500000 * 10 ** 6, // 1.5M USDC dev fund (10x)
            3500000 * 10 ** 6, // 3.5M USDC liquidity fund (10x) = 5M total
            currentTime - 1 hours, // Started 1 hour ago
            currentTime + 7 days, // Ends in 7 days
            bytes32("demo-active"),
            30,
            25,
            45 // dev 30%, treasury 25%, dao 45%
        );
        console.log("DemoActive pool created at:", activePool);

        // 2. Failed Pool (ended, insufficient funding)
        console.log("Creating DemoFailed pool...");
        address failedPool = createDemoPoolWithAllocations(
            factory,
            mockUSDCAddress,
            "AI Compute Network",
            "AICOMP",
            80000000 * 10 ** 18, // 80M tokens (10x)
            4000000 * 10 ** 6, // 4M USDC dev fund (10x)
            4000000 * 10 ** 6, // 4M USDC liquidity fund (10x) = 8M total
            currentTime - 10 days, // Started 10 days ago
            currentTime - 3 days, // Ended 3 days ago
            bytes32("demo-failed"),
            20,
            30,
            50 // dev 20%, treasury 30%, dao 50%
        );
        console.log("DemoFailed pool created at:", failedPool);

        // 3. Successful Pool (ended, ready for deployment)
        console.log("Creating DemoSuccess pool...");
        address successPool = createDemoPoolWithAllocations(
            factory,
            mockUSDCAddress,
            "DeFi Yield Optimizer",
            "DEFIYO",
            50000000 * 10 ** 18, // 50M tokens (10x)
            2000000 * 10 ** 6, // 2M USDC dev fund (10x)
            3000000 * 10 ** 6, // 3M USDC liquidity fund (10x) = 5M total
            currentTime - 6 days, // Started 6 days ago
            currentTime - 1 days, // Ended 1 day ago
            bytes32("demo-success"),
            25,
            35,
            40 // dev 25%, treasury 35%, dao 40%
        );
        console.log("DemoSuccess pool created at:", successPool);

        // 4. Launched Pool (fully deployed ecosystem)
        console.log("Creating DemoLaunched pool (Prorated Protocol)...");
        address launchedPool = createDemoPoolWithAllocations(
            factory,
            mockUSDCAddress,
            "Prorated Protocol",
            "PRO",
            210000000 * 10 ** 18, // 210M tokens (10x)
            7500000 * 10 ** 6, // 7.5M USDC dev fund (10x)
            22500000 * 10 ** 6, // 22.5M USDC liquidity fund (10x) = 30M total
            currentTime - 30 days, // Started 30 days ago
            currentTime - 23 days, // Ended 23 days ago
            bytes32("demo-launched"),
            25,
            25,
            50 // dev 25%, treasury 25%, dao 50%
        );
        console.log("DemoLaunched pool created at:", launchedPool);

        // Log all pool addresses for the next script
        console.log("DEMO_ACTIVE_POOL=", activePool);
        console.log("DEMO_FAILED_POOL=", failedPool);
        console.log("DEMO_SUCCESS_POOL=", successPool);
        console.log("DEMO_LAUNCHED_POOL=", launchedPool);

        console.log("=== Demo Pools Creation Complete ===");

        vm.stopBroadcast();
    }

    function createDemoPoolWithAllocations(
        DemoProratedFactory factory,
        address mockUSDC,
        string memory tokenName,
        string memory tokenSymbol,
        uint256 tokenTotalSupply,
        uint256 developmentFund,
        uint256 liquidityFund,
        uint256 startTime,
        uint256 endTime,
        bytes32 salt,
        uint256 developerPercent,
        uint256 treasuryPercent,
        uint256 daoPercent
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
                developerPercent: developerPercent,
                treasuryPercent: treasuryPercent,
                daoPercent: daoPercent
            });

        return factory.createPool(config, salt);
    }
}
