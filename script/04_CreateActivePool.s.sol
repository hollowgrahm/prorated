// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/DemoProratedFactory.sol";
import "../../src/demo/DemoProratedPool.sol";
import "../../src/demo/MockUSDC.sol";

contract CreateActivePool is Script {
    function run(address factoryAddress, address mockUSDCAddress) external {
        vm.startBroadcast();

        console.log("=== Creating Active Demo Pool ===");
        console.log("Deployer:", msg.sender);
        console.log("Factory:", factoryAddress);
        console.log("MockUSDC:", mockUSDCAddress);

        DemoProratedFactory factory = DemoProratedFactory(factoryAddress);
        MockUSDC mockUSDC = MockUSDC(mockUSDCAddress);
        uint256 currentTime = block.timestamp;

        console.log("Creating DemoActive pool...");

        DemoProratedPool.PoolConfig memory config = DemoProratedPool
            .PoolConfig({
                owner: msg.sender,
                tokenName: "DemoActive",
                tokenSymbol: "DEMO",
                tokenTotalSupply: 10000000 * 10 ** 18, // 10M tokens
                developmentFund: 100000 * 10 ** 6, // 100K USDC dev fund
                liquidityFund: 900000 * 10 ** 6, // 900K USDC liquidity fund
                startTime: currentTime - 1 hours, // Started 1 hour ago
                endTime: currentTime + 7 days, // Ends in 7 days
                fundingToken: address(mockUSDC),
                developerPercent: 30, // 30% to dev
                treasuryPercent: 25, // 25% to treasury
                daoPercent: 45 // 45% to DAO
            });

        address pool = factory.createPool(config, bytes32("demo-active"));
        console.log("Pool created at:", pool);

        // Add pool to MockUSDC demo contracts
        mockUSDC.addDemoContract(pool);
        console.log("Pool added to MockUSDC demo contracts");

        // Fund pool with 100K USDC (10% of goal)
        console.log("Funding pool with 100K USDC...");
        mockUSDC.mint(100000 * 10 ** 6);
        mockUSDC.approve(pool, 100000 * 10 ** 6);
        DemoProratedPool(pool).contribute(100000 * 10 ** 6, 52); // 52 weeks lock

        console.log("Active pool created and funded successfully!");
        console.log("Pool Address:", pool);
        console.log("Status: ACTIVE (10% funded, 7 days remaining)");

        vm.stopBroadcast();
    }
}
