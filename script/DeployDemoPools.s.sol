// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/demo/DemoProratedFactory.sol";
import "../src/demo/DemoProratedPool.sol";

contract DeployDemoPools is Script {
    function run() external {
        vm.startBroadcast();

        console.log("Deploying demo pools to Hyperliquid testnet...");
        console.log("Deployer:", msg.sender);

        // Use the factory that was already deployed
        address factoryAddress = 0xA419eBB6D13bdFf90d71572E0A3d58d80d308a80;
        address mockUSDCAddress = 0x08272ad394F10b591eC0F7Fd2970586184C646f2;
        
        DemoProratedFactory factory = DemoProratedFactory(factoryAddress);

        console.log("Factory address:", factoryAddress);
        console.log("MockUSDC address:", mockUSDCAddress);

        uint256 currentTime = block.timestamp;

        // Create demo pools with different allocations
        console.log("Creating DemoActive pool...");
        address activePool = createDemoPoolWithAllocations(
            factory,
            mockUSDCAddress,
            "DemoActive",
            "DEMO",
            10000000 * 10**18, // 10M tokens
            100000 * 10**6, // 100K USDC dev fund
            900000 * 10**6, // 900K USDC liquidity fund (1M total goal)
            currentTime - 1 hours, // Started 1 hour ago
            currentTime + 7 days, // Ends in 7 days
            bytes32("demo-active"),
            30, 25, 45 // dev 30%, treasury 25%, dao 45%
        );
        console.log("DemoActive pool created at:", activePool);

        console.log("Creating DemoFailed pool...");
        address failedPool = createDemoPoolWithAllocations(
            factory,
            mockUSDCAddress,
            "DemoFailed", 
            "FAIL",
            8000000 * 10**18, // 8M tokens
            400000 * 10**6, // 400K USDC dev fund
            1600000 * 10**6, // 1.6M USDC liquidity fund (2M total goal)
            currentTime - 10 days, // Started 10 days ago
            currentTime - 3 days, // Ended 3 days ago
            bytes32("demo-failed"),
            20, 30, 50 // dev 20%, treasury 30%, dao 50%
        );
        console.log("DemoFailed pool created at:", failedPool);

        console.log("Creating DemoSuccess pool...");
        address successPool = createDemoPoolWithAllocations(
            factory,
            mockUSDCAddress,
            "DemoSuccess",
            "SUCC", 
            5000000 * 10**18, // 5M tokens
            375000 * 10**6, // 375K USDC dev fund
            1125000 * 10**6, // 1.125M USDC liquidity fund (1.5M total goal)
            currentTime - 6 days, // Started 6 days ago
            currentTime - 1 days, // Ended 1 day ago
            bytes32("demo-success"),
            25, 35, 40 // dev 25%, treasury 35%, dao 40%
        );
        console.log("DemoSuccess pool created at:", successPool);

        console.log("Creating DemoLaunched pool (Prorated Protocol)...");
        address launchedPool = createDemoPoolWithAllocations(
            factory,
            mockUSDCAddress,
            "Prorated Protocol",
            "PRO",
            21000000 * 10**18, // 21M tokens
            750000 * 10**6, // 750K USDC dev fund
            2250000 * 10**6, // 2.25M USDC liquidity fund (3M total goal)
            currentTime - 30 days, // Started 30 days ago
            currentTime - 23 days, // Ended 23 days ago
            bytes32("demo-launched"),
            25, 25, 50 // dev 25%, treasury 25%, dao 50%
        );
        console.log("DemoLaunched pool created at:", launchedPool);

        // Get the current pool count
        uint256 poolCount = factory.getPoolCount();
        console.log("Total pools after deployment:", poolCount);

        // Log the addresses of the newly created pools
        for (uint256 i = poolCount - 4; i < poolCount; i++) {
            address poolAddress = factory.allPools(i);
            console.log("Pool", i, "address:", poolAddress);
        }

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
