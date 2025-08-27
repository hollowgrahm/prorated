// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/DemoProratedFactory.sol";
import "../../src/demo/DemoProratedPool.sol";
import "../../src/demo/MockUSDC.sol";

contract CreateFailedPool is Script {
    function run(address factoryAddress, address mockUSDCAddress) external {
        vm.startBroadcast();

        console.log("=== Creating Failed Demo Pool ===");
        console.log("Deployer:", msg.sender);
        console.log("Factory:", factoryAddress);
        console.log("MockUSDC:", mockUSDCAddress);

        DemoProratedFactory factory = DemoProratedFactory(factoryAddress);
        MockUSDC mockUSDC = MockUSDC(mockUSDCAddress);
        uint256 currentTime = block.timestamp;

        console.log("Creating DemoFailed pool...");

        DemoProratedPool.PoolConfig memory config = DemoProratedPool
            .PoolConfig({
                owner: msg.sender,
                tokenName: "DemoFailed",
                tokenSymbol: "FAIL",
                tokenTotalSupply: 8000000 * 10 ** 18, // 8M tokens
                developmentFund: 400000 * 10 ** 6, // 400K USDC dev fund
                liquidityFund: 1600000 * 10 ** 6, // 1.6M USDC liquidity fund
                startTime: currentTime - 10 days, // Started 10 days ago
                endTime: currentTime - 3 days, // Ended 3 days ago
                fundingToken: address(mockUSDC),
                developerPercent: 20, // 20% to dev
                treasuryPercent: 30, // 30% to treasury
                daoPercent: 50 // 50% to DAO
            });

        address pool = factory.createPool(config, bytes32("demo-failed"));
        console.log("Pool created at:", pool);

        // Add pool to MockUSDC demo contracts
        mockUSDC.addDemoContract(pool);
        console.log("Pool added to MockUSDC demo contracts");

        // Use time manipulation to fund past pool
        console.log("Using time manipulation to fund expired pool...");
        DemoProratedPool poolContract = DemoProratedPool(pool);

        console.log("Rewinding time by 8 days...");
        poolContract.rewindTime(8 days);

        // Fund pool with 600K USDC (insufficient - only 30% of 2M goal)
        console.log("Funding pool with 600K USDC (insufficient)...");
        mockUSDC.mint(600000 * 10 ** 6);
        mockUSDC.approve(pool, 600000 * 10 ** 6);
        DemoProratedPool(pool).contribute(600000 * 10 ** 6, 52); // 52 weeks lock

        console.log("Skipping time forward by 8 days...");
        poolContract.skipTime(8 days);

        console.log("Failed pool created and funded successfully!");
        console.log("Pool Address:", pool);
        console.log("Status: FAILED (30% funded, expired 3 days ago)");

        vm.stopBroadcast();
    }
}
