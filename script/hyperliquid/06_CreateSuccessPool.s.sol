// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/demo/DemoProratedFactory.sol";
import "../../src/demo/DemoProratedPool.sol";
import "../../src/demo/MockUSDC.sol";

contract CreateSuccessPool is Script {
    function run(address factoryAddress, address mockUSDCAddress) external {
        vm.startBroadcast();

        console.log("=== Creating Successful Demo Pool ===");
        console.log("Deployer:", msg.sender);
        console.log("Factory:", factoryAddress);
        console.log("MockUSDC:", mockUSDCAddress);

        DemoProratedFactory factory = DemoProratedFactory(factoryAddress);
        MockUSDC mockUSDC = MockUSDC(mockUSDCAddress);
        uint256 currentTime = block.timestamp;

        console.log("Creating DemoSuccess pool...");

        DemoProratedPool.PoolConfig memory config = DemoProratedPool
            .PoolConfig({
                owner: msg.sender,
                tokenName: "DemoSuccess",
                tokenSymbol: "SUCC",
                tokenTotalSupply: 5000000 * 10 ** 18, // 5M tokens
                developmentFund: 375000 * 10 ** 6, // 375K USDC dev fund
                liquidityFund: 1125000 * 10 ** 6, // 1.125M USDC liquidity fund
                startTime: currentTime - 6 days, // Started 6 days ago
                endTime: currentTime - 1 days, // Ended 1 day ago
                fundingToken: address(mockUSDC),
                developerPercent: 25, // 25% to dev
                treasuryPercent: 35, // 35% to treasury
                daoPercent: 40 // 40% to DAO
            });

        address pool = factory.createPool(config, bytes32("demo-success"));
        console.log("Pool created at:", pool);

        // Add pool to MockUSDC demo contracts
        mockUSDC.addDemoContract(pool);
        console.log("Pool added to MockUSDC demo contracts");

        // Use time manipulation to fund past pool
        console.log("Using time manipulation to fund expired pool...");
        DemoProratedPool poolContract = DemoProratedPool(pool);

        console.log("Rewinding time by 4 days...");
        poolContract.rewindTime(4 days);

        // Fund pool with 1.5M USDC (fully funded)
        console.log("Funding pool with 1.5M USDC (fully funded)...");
        mockUSDC.mint(1500000 * 10 ** 6);
        mockUSDC.approve(pool, 1500000 * 10 ** 6);
        DemoProratedPool(pool).contribute(1500000 * 10 ** 6, 52); // 52 weeks lock

        console.log("Skipping time forward by 4 days...");
        poolContract.skipTime(4 days);

        console.log("Successful pool created and funded successfully!");
        console.log("Pool Address:", pool);
        console.log("Status: SUCCESS (100% funded, ready for deployment)");

        vm.stopBroadcast();
    }
}
